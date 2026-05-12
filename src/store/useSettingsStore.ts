import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { sqliteStorage } from './sqliteStorage';

interface SettingsState {
  theme: 'light' | 'dark';
  model: string;
  geminiApiKey: string;
  openRouterApiKey: string;
  toggleTheme: () => void;
  setModel: (model: string) => void;
  setGeminiApiKey: (key: string) => void;
  setOpenRouterApiKey: (key: string) => void;
}

const DEFAULT_STATE = {
  theme: 'dark' as const,
  model: 'gemini-3-flash-preview',
  geminiApiKey: '',
  openRouterApiKey: '',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setModel: (model) => set({ model }),
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setOpenRouterApiKey: (key) => set({ openRouterApiKey: key }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => sqliteStorage),
      merge: (persistedState: any, currentState: SettingsState) => {
        if (!persistedState) return { ...currentState, ...DEFAULT_STATE };
        return { ...currentState, ...persistedState };
      },
    }
  )
);
