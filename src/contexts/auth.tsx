import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  getStoredUser,
  login as apiLogin,
  logout as apiLogout,
  apiFetch,
  saveUserData,
  clearAuthStorage,
} from '@/services/api';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedUser = await getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          // Atualiza perfil silenciosamente em segundo plano
          try {
            const res = await apiFetch('/auth/me/');
            if (res.ok) {
              const updatedUser = await res.json();
              setUser(updatedUser);
              await saveUserData(updatedUser);
            }
          } catch {
            // Falha de rede não desloga de imediato se já tiver cache
          }
        }
      } catch (e) {
        console.error('[Auth] Erro ao carregar dados locais:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStorageData();
  }, []);

  const signIn = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: loggedUser, mustChangePassword } = await apiLogin(username, password);
      setUser(loggedUser);
      return { mustChangePassword };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await apiLogout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await apiFetch('/auth/me/');
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        await saveUserData(updated);
      }
    } catch (e) {
      console.warn('[Auth] Falha ao recarregar perfil:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
