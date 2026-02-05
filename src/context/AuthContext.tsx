'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { API_ROUTES } from '@/config/constants';
import type { GroupedConversation, User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  toggleFavorite: (listingId: number) => Promise<boolean>;
  isFavorite: (listingId: number) => boolean;
  unreadCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for unread messages using SSE
  useEffect(() => {
    if (!user) return;

    const checkUnread = async () => {
      try {
        const res = await fetch(`/api/messages?userId=${user.id}`);
        if (res.ok) {
          const convs: GroupedConversation[] = await res.json();
          let count = 0;
          convs.forEach((conv) => {
            conv.messages.forEach((msg) => {
              if (!msg.read && msg.senderId !== user.id) {
                count++;
              }
            });
          });
          setUnreadCount(count);
        }
      } catch (err) {
        console.error('Error checking unread messages:', err);
      }
    };

    checkUnread();

    const eventSource = new EventSource(`/api/events?userId=${user.id}`);
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'update') {
        checkUnread();
      }
    };

    return () => {
      eventSource.close();
    };
  }, [user]);

  // Hydrate from session cookie on mount
  useEffect(() => {
    const hydrate = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const { data: userData } = await res.json();
          setUser(userData);
        } // If not OK, user is not logged in, which is fine.
      } catch (error) {
        console.error('Auth hydration error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    hydrate();
  }, []);

  const login = useCallback((userData: User) => {
    // Ensure defaults for optional fields
    const normalizedUser: User = {
      ...userData,
      favorites: userData.favorites || [],
      verified: userData.verified ?? false,
    };
    setUser(normalizedUser);
    // Cookie is set by the API route, no localStorage needed
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    // Re-fetch user data using the session cookie
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const { data: userData } = await res.json();
        setUser(userData);
      } else {
        setUser(null); // Session expired or invalid
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback(
    async (listingId: number): Promise<boolean> => {
      if (!user) return false;

      const isFav = user.favorites.includes(listingId);
      
      // Optimistic update
      const newFavorites = isFav
        ? user.favorites.filter((id) => id !== listingId)
        : [...user.favorites, listingId];
      
      updateUser({ favorites: newFavorites });

      try {
        const res = await fetch(`${API_ROUTES.USERS}/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggleFavorite',
            listingId,
          }),
        });

        if (!res.ok) {
          // Rollback on failure
          updateUser({ favorites: user.favorites });
          return false;
        }

        return true;
      } catch (error) {
        // Rollback on error
        updateUser({ favorites: user.favorites });
        console.error('Failed to toggle favorite:', error);
        return false;
      }
    },
    [user, updateUser]
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
        isLoading,
        login,
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
