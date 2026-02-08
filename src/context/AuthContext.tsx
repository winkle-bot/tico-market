'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { User, PickupLocation } from '@/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  toggleFavorite: (listingId: number) => Promise<boolean>;
  isFavorite: (listingId: number) => boolean;
  unreadCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  type ProfileRow = Database['public']['Tables']['profiles']['Row'];
  type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
  type FavoriteRow = Database['public']['Tables']['favorites']['Row'];
  type FavoriteInsert = Database['public']['Tables']['favorites']['Insert'];
  type MessageRow = Database['public']['Tables']['messages']['Row'];

  const mapPickupLocations = useCallback(
    (pickupLocations: ProfileRow['pickup_locations']): PickupLocation[] | undefined => {
      if (!Array.isArray(pickupLocations)) return undefined;
      return pickupLocations as unknown as PickupLocation[];
    },
    []
  );

  const toFallbackUser = useCallback(
    (nextUser: SupabaseUser, currentUser: User | null): User => ({
      id: nextUser.id,
      email: nextUser.email || currentUser?.email || '',
      name:
        (nextUser.user_metadata?.name as string | undefined) ||
        currentUser?.name ||
        nextUser.email?.split('@')[0] ||
        'User',
      joined: currentUser?.joined || new Date().toISOString(),
      verified: currentUser?.verified ?? Boolean(nextUser.email_confirmed_at),
      role: currentUser?.role || 'user',
      favorites: currentUser?.favorites || [],
      bio: currentUser?.bio,
      location: currentUser?.location,
      rating: currentUser?.rating,
      pickupLocations: currentUser?.pickupLocations,
      acceptsDelivery: currentUser?.acceptsDelivery,
    }),
    []
  );

  // Fetch profile data from Supabase
  const fetchProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          favorites:favorites(listing_id)
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      const profile = profileData as (ProfileRow & { favorites?: Pick<FavoriteRow, 'listing_id'>[] }) | null;
      if (!profile) {
        return null;
      }

      // Transform favorites from array of objects to array of numbers
      const favorites = profile.favorites?.map((f: { listing_id: number }) => f.listing_id) || [];

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        joined: profile.joined,
        verified: profile.verified,
        role: profile.role as 'user' | 'admin' | 'moderator',
        favorites,
        bio: profile.bio ?? undefined,
        location: profile.location ?? undefined,
        rating: profile.rating,
        pickupLocations: mapPickupLocations(profile.pickup_locations),
        acceptsDelivery: profile.accepts_delivery,
      };
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  }, [mapPickupLocations]);

  // Listen for auth state changes
  useEffect(() => {
    let isMounted = true;

    const loadInitialSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error loading session:', error);
        }
        if (!isMounted) return;

        const currentSupabaseUser = session?.user ?? null;
        setSupabaseUser(currentSupabaseUser);

        if (!currentSupabaseUser) {
          setUser(null);
          return;
        }

        const profile = await fetchProfile(currentSupabaseUser.id);
        if (!isMounted) return;
        setUser(profile ?? toFallbackUser(currentSupabaseUser, null));
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        if (isMounted) {
          setSupabaseUser(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentSupabaseUser = session?.user ?? null;
        setSupabaseUser(currentSupabaseUser);

        if (!currentSupabaseUser) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        void (async () => {
          try {
            const profile = await fetchProfile(currentSupabaseUser.id);
            if (!isMounted) return;
            setUser((prev) => profile ?? toFallbackUser(currentSupabaseUser, prev));
          } catch (error) {
            console.error('Failed to sync auth profile:', error);
            if (isMounted) {
              setUser((prev) => toFallbackUser(currentSupabaseUser, prev));
            }
          } finally {
            if (isMounted) {
              setIsLoading(false);
            }
          }
        })();
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, toFallbackUser]);

  // Poll for unread messages
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const checkUnread = async () => {
      try {
        const { data: messages, error } = await supabase
          .from('messages')
          .select('sender_id')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .eq('read', false);

        if (error) {
          console.error('Error checking unread messages:', error);
          return;
        }

        // Count messages not sent by current user
        const typedMessages = messages as Pick<MessageRow, 'sender_id'>[] | null;
        const count = typedMessages?.filter((msg) => msg.sender_id !== user.id).length || 0;
        setUnreadCount(count);
      } catch (err) {
        console.error('Error checking unread messages:', err);
      }
    };

    checkUnread();

    // Set up real-time subscription for messages
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          checkUnread();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setSupabaseUser(data.user);
        setUser((prev) => prev ?? toFallbackUser(data.user, prev));
        void fetchProfile(data.user.id).then((profile) => {
          if (profile) {
            setUser(profile);
          }
        });
      }

      return {};
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return { error: message };
    }
  }, [fetchProfile, toFallbackUser]);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<{ error?: string }> => {
    try {
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || 'https://tico-market.c0di.workers.dev';
      const redirectTo = `${baseUrl}/auth/callback`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      return { error: message };
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<{ error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { error: 'Email is required' };
    }

    try {
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || '';
      const redirectTo = `${baseUrl}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Password reset failed';
      return { error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    }
    setUser(null);
    setSupabaseUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!supabaseUser?.id) {
      setUser(null);
      return;
    }

    const profile = await fetchProfile(supabaseUser.id);
    setUser((prev) => profile ?? toFallbackUser(supabaseUser, prev));
  }, [supabaseUser, fetchProfile, toFallbackUser]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user?.id) return;

    // Transform User type to database format
    const dbUpdates: ProfileUpdate = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio ?? null;
    if (updates.location !== undefined) dbUpdates.location = updates.location ?? null;
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
    if (updates.verified !== undefined) dbUpdates.verified = updates.verified;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.pickupLocations !== undefined) {
      dbUpdates.pickup_locations = updates.pickupLocations as unknown as ProfileUpdate['pickup_locations'];
    }
    if (updates.acceptsDelivery !== undefined) dbUpdates.accepts_delivery = updates.acceptsDelivery;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates as never)
      .eq('id', user.id);

    if (error) {
      console.error('Error updating user:', error);
      return;
    }

    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, [user]);

  const toggleFavorite = useCallback(
    async (listingId: number): Promise<boolean> => {
      if (!user) return false;

      const isFav = user.favorites.includes(listingId);

      // Optimistic update
      const newFavorites = isFav
        ? user.favorites.filter((id) => id !== listingId)
        : [...user.favorites, listingId];

      setUser((prev) => {
        if (!prev) return null;
        return { ...prev, favorites: newFavorites };
      });

      try {
        if (isFav) {
          // Remove favorite
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('listing_id', listingId);

          if (error) throw error;
        } else {
          // Add favorite
          const favoriteInsert: FavoriteInsert = { user_id: user.id, listing_id: listingId };
          const { error } = await supabase
            .from('favorites')
            .insert(favoriteInsert as never);

          if (error) throw error;
        }

        return true;
      } catch (error) {
        // Rollback on error
        setUser((prev) => {
          if (!prev) return null;
          return { ...prev, favorites: user.favorites };
        });
        console.error('Failed to toggle favorite:', error);
        return false;
      }
    },
    [user]
  );

  const isFavorite = useCallback(
    (listingId: number): boolean => {
      return user?.favorites.includes(listingId) ?? false;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        isLoading,
        login,
        signup,
        requestPasswordReset,
        logout,
        refreshUser,
        updateUser,
        toggleFavorite,
        isFavorite,
        unreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
