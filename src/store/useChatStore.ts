import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { sqliteStorage } from './sqliteStorage';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  isLoading?: boolean;
  modelName?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  createSession: () => string;
  setActiveSession: (id: string) => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (sessionId: string, messageId: string, content: string) => void;
  setMessageLoading: (sessionId: string, messageId: string, loading: boolean) => void;
  deleteMessage: (sessionId: string, messageId: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
}

const DEFAULT_STATE = {
  sessions: [],
  activeSessionId: null,
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      createSession: () => {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: 'New Chat',
          messages: [],
          updatedAt: Date.now(),
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: newSession.id,
        }));
        return newSession.id;
      },

      setActiveSession: (id) => set({ activeSessionId: id }),

      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, message], updatedAt: Date.now() }
              : s
          ),
        })),

      updateMessage: (sessionId, messageId, content) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId ? { ...m, content, isLoading: false } : m
                  ),
                }
              : s
          ),
        })),

      setMessageLoading: (sessionId, messageId, loading) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId ? { ...m, isLoading: loading } : m
                  ),
                }
              : s
          ),
        })),

      deleteMessage: (sessionId, messageId) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: s.messages.filter((m) => m.id !== messageId) }
              : s
          ),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        })),

      renameSession: (id, title) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, title } : s
          ),
        })),
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => sqliteStorage),
      merge: (persistedState: any, currentState: ChatState) => {
        if (!persistedState) return { ...currentState, ...DEFAULT_STATE };
        return { ...currentState, ...persistedState };
      },
    }
  )
);
