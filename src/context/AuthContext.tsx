import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import API from '../services/api.js';
import { User } from '../types.js';

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (email: string, password: string) => Promise<User>;
  register: (userData: any) => Promise<User>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
  quickLogin: (role: 'CITIZEN' | 'RESPONDER' | 'ADMIN') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const { data } = await API.get('/auth/me');
      setUser(data);
    } catch {
      localStorage.removeItem('rescuenet_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('rescuenet_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('rescuenet_token', data.token);
    setUser(data);
    return data;
  };

  const register = async (userData: any): Promise<User> => {
    const { data } = await API.post('/auth/register', userData);
    localStorage.setItem('rescuenet_token', data.token);
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('rescuenet_token');
    setUser(null);
  };

  const quickLogin = async (role: 'CITIZEN' | 'RESPONDER' | 'ADMIN') => {
    setLoading(true);
    let email = 'citizen@emergency.org';
    if (role === 'RESPONDER') email = 'responder@emergency.org';
    if (role === 'ADMIN') email = 'admin@emergency.org';
    try {
      await login(email, 'password123');
    } catch (e) {
      console.error('Quick login failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        logout,
        loading,
        refreshUser: fetchCurrentUser,
        quickLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
