import { create } from 'zustand';

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

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  model: 'gemini-3-flash-preview',
  geminiApiKey: '',
  openRouterApiKey: '',
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setModel: (model) => set({ model }),
  setGeminiApiKey: (key) => set({ geminiApiKey: key }),
  setOpenRouterApiKey: (key) => set({ openRouterApiKey: key }),
}));
