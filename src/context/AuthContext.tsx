'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { GroupedConversation, User } from '@/types';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ error?: string }>;
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

  // Fetch profile data from Supabase
  const fetchProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data: profile, error } = await (supabase
        .from('profiles') as any)
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

      // Transform favorites from array of objects to array of numbers
      const favorites = profile.favorites?.map((f: { listing_id: number }) => f.listing_id) || [];

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        joined: profile.joined,
        verified: profile.verified,
        favorites,
        bio: profile.bio,
        location: profile.location,
        rating: profile.rating,
        pickupLocations: profile.pickup_locations,
        acceptsDelivery: profile.accepts_delivery,
      };
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(profile => {
          setUser(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(profile);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Poll for unread messages
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const checkUnread = async () => {
      try {
        const { data: messages, error } = await (supabase
          .from('messages') as any)
          .select('*')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .eq('read', false);

        if (error) {
          console.error('Error checking unread messages:', error);
          return;
        }

        // Count messages not sent by current user
        const count = messages?.filter((msg: { sender_id: string }) => msg.sender_id !== user.id).length || 0;
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
          filter: `buyer_id=eq.${user.id} OR seller_id=eq.${user.id}`,
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
        const profile = await fetchProfile(data.user.id);
        setUser(profile);
        setSupabaseUser(data.user);
      }

      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  }, [fetchProfile]);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!supabaseUser?.id) {
      setUser(null);
      return;
    }

    const profile = await fetchProfile(supabaseUser.id);
    setUser(profile);
  }, [supabaseUser, fetchProfile]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user?.id) return;

    // Transform User type to database format
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
    if (updates.verified !== undefined) dbUpdates.verified = updates.verified;
    if (updates.pickupLocations !== undefined) dbUpdates.pickup_locations = updates.pickupLocations;
    if (updates.acceptsDelivery !== undefined) dbUpdates.accepts_delivery = updates.acceptsDelivery;

    const { error } = await (supabase
      .from('profiles') as any)
      .update(dbUpdates)
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
          const { error } = await (supabase
            .from('favorites') as any)
            .insert({ user_id: user.id, listing_id: listingId });

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
