'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { API_ROUTES } from '@/config/constants';

// Complete user type matching what the API returns
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  joined: string;
  verified: boolean;
  favorites: number[];
  bio?: string;
  location?: string;
  rating?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (userData: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
  toggleFavorite: (listingId: number) => Promise<boolean>;
  isFavorite: (listingId: number) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'tico-user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const hydrate = async () => {
      try {
        const savedUser = localStorage.getItem(STORAGE_KEY);
        if (savedUser) {
          const parsed = JSON.parse(savedUser) as AuthUser;
          // Validate user still exists by fetching fresh data
          const res = await fetch(`${API_ROUTES.USERS}/${parsed.id}`);
          if (res.ok) {
            const freshUser = await res.json();
            // Merge fresh data (especially favorites) with stored data
            const mergedUser: AuthUser = {
              ...parsed,
              favorites: freshUser.favorites || [],
              verified: freshUser.verified ?? parsed.verified,
              bio: freshUser.bio || parsed.bio,
              location: freshUser.location || parsed.location,
            };
            setUser(mergedUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedUser));
          } else {
            // User no longer exists in DB, clear local storage
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Auth hydration error:', error);
        // On error, still try to use cached data
        const savedUser = localStorage.getItem(STORAGE_KEY);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };

    hydrate();
  }, []);

  const login = useCallback((userData: AuthUser) => {
    // Ensure defaults for optional fields
    const normalizedUser: AuthUser = {
      ...userData,
      favorites: userData.favorites || [],
      verified: userData.verified ?? false,
    };
    setUser(normalizedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch(`${API_ROUTES.USERS}/${user.id}`);
      if (res.ok) {
        const freshUser = await res.json();
        const mergedUser: AuthUser = {
          ...user,
          favorites: freshUser.favorites || [],
          verified: freshUser.verified ?? user.verified,
          bio: freshUser.bio,
          location: freshUser.location,
        };
        setUser(mergedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedUser));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [user]);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
