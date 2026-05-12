import { StateStorage } from 'zustand/middleware';
import { getDB } from '../services/DatabaseService';

const getActiveUserKey = async (name: string): Promise<string> => {
  try {
    const db = await getDB();
    const session = await db.getFirstAsync<{user_id: string}>('SELECT user_id FROM session LIMIT 1');
    const userId = session ? session.user_id : 'unauthenticated';
    return `${userId}_${name}`;
  } catch (e) {
    return `error_${name}`;
  }
};

export const sqliteStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await getDB();
      const key = await getActiveUserKey(name);
      const result = await db.getFirstAsync<{value: string}>('SELECT value FROM settings WHERE key = ?', [key]);
      return result ? result.value : null;
    } catch (e) {
      console.error('Failed to get item from sqlite', e);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await getDB();
      const key = await getActiveUserKey(name);
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    } catch (e) {
      console.error('Failed to set item in sqlite', e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await getDB();
      const key = await getActiveUserKey(name);
      await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
    } catch (e) {
      console.error('Failed to remove item from sqlite', e);
    }
  },
};
