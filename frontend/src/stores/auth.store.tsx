import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../../../shared/src/types';
import { api } from '../services/api';

const DEMO_LOGIN_PRESETS: Record<UserRole, { email: string; password: string }> = {
  ADMINISTRATOR: { email: 'admin@smartot.hospital', password: 'Admin@123password' },
  OT_MANAGER: { email: 'otmanager@smartot.hospital', password: 'OTManager@123password' },
  CSSD_STAFF: { email: 'cssd@smartot.hospital', password: 'CSSDStaff@123password' },
  WARD_STAFF: { email: 'ward@smartot.hospital', password: 'WardStaff@123password' },
};


interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickLoginAs: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Session key (sessionStorage clears on new tab/window/fresh URL visit) ───
const SESSION_KEY = 'smartot_session_active';

const DEFAULT_DEMO_USER: User = {
  id: 'usr_admin_01',
  email: 'admin@smartot.hospital',
  name: 'Dr. Sarah Jenkins',
  role: 'ADMINISTRATOR',
  department: 'Hospital Administration',
  createdAt: '2026-08-01T08:00:00Z',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('smartot_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_DEMO_USER;
  });
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('smartot_auth_token')
  );

  // sessionStorage.getItem returns null on fresh visits (new tab / paste URL)
  // It persists across F5 refreshes on the same tab.
  const isActiveSession = Boolean(sessionStorage.getItem(SESSION_KEY));

  // isLoading = true only when we have a token AND an active session (i.e. a refresh on dashboard)
  // For fresh visits we skip loading and go straight to landing page.
  const [isLoading, setIsLoading] = useState<boolean>(
    () => Boolean(token && isActiveSession)
  );

  // On mount: if this is a refresh (token + active session), verify token once
  useEffect(() => {
    if (token && isActiveSession) {
      api.getMe()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('smartot_auth_user', JSON.stringify(userData));
        })
        .catch(() => {
          // Backend unreachable — keep saved user as graceful fallback (demo / offline)
          const savedUser = localStorage.getItem('smartot_auth_user');
          if (!savedUser) {
            // No fallback user — clear everything
            setUser(null);
            setToken(null);
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem('smartot_auth_token');
            localStorage.removeItem('smartot_auth_user');
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []); // run once on mount

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('smartot_auth_token', res.token);
      localStorage.setItem('smartot_auth_user', JSON.stringify(res.user));
      // Mark this tab as having an active session so refresh stays on dashboard
      sessionStorage.setItem(SESSION_KEY, '1');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLoginAs = async (role: UserRole) => {
    const preset = DEMO_LOGIN_PRESETS[role] || DEMO_LOGIN_PRESETS.ADMINISTRATOR;
    await login(preset.email, preset.password);
  };


  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('smartot_auth_token');
    localStorage.removeItem('smartot_auth_user');
  };

  // isAuthenticated requires BOTH a valid user/token AND an active session this tab
  const isAuthenticated = Boolean(user && token && sessionStorage.getItem(SESSION_KEY));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        quickLoginAs,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
