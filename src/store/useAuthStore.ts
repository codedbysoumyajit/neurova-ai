import { create } from 'zustand';
import { getDB } from '../services/DatabaseService';
import { useChatStore } from './useChatStore';
import { useSettingsStore } from './useSettingsStore';

interface User {
  id: string;
  email: string | null;
  name: string;
  isGuest: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (email: string, password?: string, name?: string) => Promise<boolean>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

const rehydrateUserStores = async () => {
  await useChatStore.persist.rehydrate();
  await useSettingsStore.persist.rehydrate();
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isReady: false,

  loadSession: async () => {
    try {
      const db = await getDB();
      const sessionResult = await db.getFirstAsync<{user_id: string}>('SELECT user_id FROM session LIMIT 1');
      if (sessionResult) {
        const user = await db.getFirstAsync<User>('SELECT id, email, name, isGuest FROM users WHERE id = ?', [sessionResult.user_id]);
        if (user) {
          set({ user, isAuthenticated: true, isReady: true });
          await rehydrateUserStores();
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load session", e);
    }
    set({ user: null, isAuthenticated: false, isReady: true });
    await rehydrateUserStores();
  },

  login: async (email: string, password?: string) => {
    try {
      const db = await getDB();
      const user = await db.getFirstAsync<User>('SELECT id, email, name, isGuest FROM users WHERE email = ? AND password = ?', [email, password || '']);
      if (user) {
        await db.runAsync('DELETE FROM session');
        await db.runAsync('INSERT INTO session (id, user_id) VALUES (?, ?)', [Date.now().toString(), user.id]);
        set({ user, isAuthenticated: true });
        await rehydrateUserStores();
        return true;
      }
    } catch (e) {
      console.error("Login failed", e);
    }
    return false;
  },

  register: async (email: string, password?: string, name?: string) => {
    try {
      const db = await getDB();
      const id = Date.now().toString();
      await db.runAsync('INSERT INTO users (id, email, password, name, isGuest) VALUES (?, ?, ?, ?, 0)', [id, email, password || '', name || email.split('@')[0]]);
      await db.runAsync('DELETE FROM session');
      await db.runAsync('INSERT INTO session (id, user_id) VALUES (?, ?)', [Date.now().toString(), id]);
      const user = await db.getFirstAsync<User>('SELECT id, email, name, isGuest FROM users WHERE id = ?', [id]);
      if (user) {
        set({ user, isAuthenticated: true });
        await rehydrateUserStores();
        return true;
      }
    } catch (e) {
      console.error("Registration failed", e);
    }
    return false;
  },

  loginAsGuest: async () => {
    try {
      const db = await getDB();
      const id = `guest_${Date.now()}`;
      await db.runAsync('INSERT INTO users (id, email, password, name, isGuest) VALUES (?, ?, ?, ?, 1)', [id, null, '', 'Guest', 1]);
      await db.runAsync('DELETE FROM session');
      await db.runAsync('INSERT INTO session (id, user_id) VALUES (?, ?)', [Date.now().toString(), id]);
      const user = await db.getFirstAsync<User>('SELECT id, email, name, isGuest FROM users WHERE id = ?', [id]);
      if (user) {
        set({ user, isAuthenticated: true });
        await rehydrateUserStores();
      }
    } catch (e) {
      console.error("Guest login failed", e);
    }
  },

  logout: async () => {
    try {
      const db = await getDB();
      await db.runAsync('DELETE FROM session');
    } catch (e) {
      console.error("Logout failed", e);
    }
    set({ user: null, isAuthenticated: false });
    await rehydrateUserStores();
  },
}));
