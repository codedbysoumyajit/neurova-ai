import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
  Keyboard,
  Clipboard,
  AppState,
} from 'react-native';
import { useChatStore, Message } from '@/src/store/useChatStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { useTheme } from '@/src/theme/useTheme';
import { AIService, AIMessage } from '@/src/services/AIService';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThinkingAnimation } from '@/src/components/ThinkingAnimation';
import { MarkdownRenderer } from '@/src/components/MarkdownRenderer';

// ─── Message Action Bar ───────────────────────────────────────────────────────

function MessageActions({
  isUser,
  content,
  primaryColor,
  surfaceBg,
  borderColor,
  textSecondary,
}: {
  isUser: boolean;
  content: string;
  primaryColor: string;
  surfaceBg: string;
  borderColor: string;
  textSecondary: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(180).springify()}
      exiting={FadeOut.duration(120)}
      style={[
        styles.actionBar,
        {
          backgroundColor: surfaceBg,
          borderColor,
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          marginLeft: isUser ? undefined : 38,
        },
      ]}
    >
      <TouchableOpacity style={styles.actionBtn} onPress={handleCopy} activeOpacity={0.7}>
        <Text style={styles.actionIcon}>{copied ? '✓' : '⎘'}</Text>
        <Text style={[styles.actionLabel, { color: copied ? primaryColor : textSecondary }]}>
          {copied ? 'Copied' : 'Copy'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Single Message Row ───────────────────────────────────────────────────────

function MessageRow({
  item,
  sessionId,
  c,
}: {
  item: Message;
  sessionId: string;
  c: ReturnType<typeof useTheme>;
}) {
  const [showActions, setShowActions] = useState(false);
  const isUser = item.role === 'user';

  const handleLongPress = () => {
    if (!item.isLoading && item.content) {
      setShowActions((v) => !v);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(280).delay(40)}>
      {/* Bubble row */}
      <View style={[styles.msgRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
        {/* AI Avatar */}
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: c.primaryGlow, borderColor: c.primary }]}>
            <Text style={[styles.avatarText, { color: c.primary }]}>N</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.88}
          onLongPress={handleLongPress}
          delayLongPress={380}
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: c.userBubble, borderBottomRightRadius: 6 }
              : { backgroundColor: c.aiBubble, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: c.border },
            showActions && styles.bubbleActive,
          ]}
        >
          {item.isLoading ? (
            <ThinkingAnimation />
          ) : isUser ? (
            <Text style={[styles.msgText, { color: '#fff' }]} selectable>
              {item.content}
            </Text>
          ) : (
            <MarkdownRenderer content={item.content} />
          )}
        </TouchableOpacity>
      </View>

      {/* Action bar — slides up below the bubble */}
      {showActions && !item.isLoading && (
        <MessageActions
          isUser={isUser}
          content={item.content}
          primaryColor={c.primary}
          surfaceBg={c.surface}
          borderColor={c.border}
          textSecondary={c.textSecondary}
        />
      )}
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const {
    sessions,
    activeSessionId,
    createSession,
    addMessage,
    updateMessage,
    setMessageLoading,
    renameSession,
  } = useChatStore();
  const { model, geminiApiKey, openRouterApiKey } = useSettingsStore();
  const c = useTheme();

  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const currentSession = sessions.find((s) => s.id === activeSessionId);
  const messages = currentSession?.messages ?? [];

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        if (Platform.OS === 'android') setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        if (Platform.OS === 'android') setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // --- Abort functionality ---
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Abort active requests if app goes to background
      if (nextAppState.match(/inactive|background/)) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        // Cleanup any stuck loading messages in the store globally
        const currentSessions = useChatStore.getState().sessions;
        currentSessions.forEach((s) => {
          const loadingMsg = s.messages.find(m => m.isLoading);
          if (loadingMsg) {
            useChatStore.getState().updateMessage(s.id, loadingMsg.id, '*Message stopped.*');
            useChatStore.getState().setMessageLoading(s.id, loadingMsg.id, false);
          }
        });
        setLoading(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const messagesLengthRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > messagesLengthRef.current) {
      scrollToEnd();
    }
    messagesLengthRef.current = messages.length;
  }, [messages.length, scrollToEnd]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = async () => {
    if (loading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    const text = input.trim();
    if (!text) return;

    const isGemini = model.startsWith('gemini');

    if (isGemini && !geminiApiKey) {
      Alert.alert('API Key Required', 'Please set your Gemini API Key in Settings before using this model.', [{ text: 'OK' }]);
      return;
    } else if (!isGemini && !openRouterApiKey) {
      Alert.alert('API Key Required', 'Please set your OpenRouter API Key in Settings before using this model.', [{ text: 'OK' }]);
      return;
    }

    let sessionId = activeSessionId;
    if (!sessionId) sessionId = createSession();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    addMessage(sessionId, userMsg);
    setInput('');
    scrollToEnd();

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      isLoading: true,
    };
    addMessage(sessionId, aiMsg);
    setLoading(true);
    scrollToEnd();

    try {
      abortControllerRef.current = new AbortController();

      const currentMessages =
        useChatStore.getState().sessions.find((s) => s.id === sessionId)?.messages ?? [];
      const history: AIMessage[] = currentMessages
        .filter((m) => m.content && !m.isLoading)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await AIService.sendMessage(history, model, geminiApiKey, openRouterApiKey, abortControllerRef.current.signal);
      updateMessage(sessionId, aiMsgId, response);

      if (currentMessages.filter((m) => m.role === 'user').length <= 1) {
        const shortTitle = text.length > 35 ? text.substring(0, 35) + '…' : text;
        renameSession(sessionId, shortTitle);
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        updateMessage(sessionId, aiMsgId, `*Message stopped.*`);
      } else {
        updateMessage(sessionId, aiMsgId, `⚠️ ${error.message}`);
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
      setMessageLoading(sessionId, aiMsgId, false);
      scrollToEnd();
    }
  };

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageRow item={item} sessionId={activeSessionId ?? ''} c={c} />
    ),
    [c, activeSessionId]
  );

  return (
    <View style={[{ flex: 1, backgroundColor: c.bg, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {/* Messages */}
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Animated.View entering={FadeIn.duration(600)} style={styles.emptyInner}>
              <View style={[styles.emptyOrb, { backgroundColor: c.primaryGlow, borderColor: c.primary }]}>
                <Text style={[styles.emptyOrbText, { color: c.primary }]}>N</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: c.text }]}>How can I help you?</Text>
              <Text style={[styles.emptySubtitle, { color: c.textSecondary }]}>
                Ask me anything — code, ideas, analysis, writing…
              </Text>

              <View style={styles.chipsWrap}>
                {['Explain React hooks', 'Write a Python script', 'Debug my code', 'Summarize an article'].map(
                  (chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={[styles.chip, { backgroundColor: c.surfaceLight, borderColor: c.border }]}
                      onPress={() => setInput(chip)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: c.textSecondary }]}>{chip}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </Animated.View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: c.surface,
              borderTopColor: c.border,
              paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 12),
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: c.inputBg, color: c.text, borderColor: c.border },
            ]}
            placeholder="Message Neurova…"
            placeholderTextColor={c.textSecondary}
            multiline
            maxLength={4000}
            value={input}
            onChangeText={setInput}
            editable={!loading}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: loading ? c.danger : (input.trim() ? c.primary : c.surfaceLight),
              },
            ]}
            onPress={handleSend}
            disabled={!loading && !input.trim()}
            activeOpacity={0.7}
          >
            {loading ? (
              <View style={styles.stopIcon} />
            ) : (
              <Text style={[styles.sendIcon, { color: input.trim() ? '#fff' : c.textSecondary }]}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 8 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyInner: { alignItems: 'center' },
  emptyOrb: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: 20,
  },
  emptyOrbText: { fontSize: 32, fontWeight: '700' },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 24, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '500' },

  // Messages
  msgRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  avatar: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, borderWidth: 1, flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleActive: {
    opacity: 0.85,
  },
  msgText: { fontSize: 15, lineHeight: 22 },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
  },
  actionIcon: { fontSize: 15, color: '#8B93A7' },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  actionDivider: { width: 1, height: 20 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 46,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4F8EF7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  sendIcon: { fontSize: 20, fontWeight: '700' },
  stopIcon: { width: 14, height: 14, backgroundColor: '#fff', borderRadius: 3 },
});
