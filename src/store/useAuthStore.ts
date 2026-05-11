import { create } from 'zustand';

interface User {
  id: string;
  email: string | null;
  name: string;
  isGuest: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => void;
  loginAsGuest: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (email: string) =>
    set({
      user: {
        id: Date.now().toString(),
        email,
        name: email.split('@')[0],
        isGuest: false,
      },
      isAuthenticated: true,
    }),
  loginAsGuest: () =>
    set({
      user: {
        id: `guest_${Date.now()}`,
        email: null,
        name: 'Guest',
        isGuest: true,
      },
      isAuthenticated: true,
    }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
