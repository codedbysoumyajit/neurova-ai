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
  AppState,
  Image,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
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

const MODEL_NAMES: Record<string, string> = {
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'openai/gpt-oss-120b:free': 'GPT OSS 120B',
  'nvidia/nemotron-3-super-120b-a12b:free': 'Nemotron 3 Super',
  'minimax/minimax-m2.5:free': 'MiniMax M2.5',
  'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3 70B',
  'qwen/qwen3-coder:free': 'Qwen 3 Coder',
};

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

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
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

const MessageRow = React.memo(({
  item,
  sessionId,
  c,
}: {
  item: Message;
  sessionId: string;
  c: ReturnType<typeof useTheme>;
}) => {
  const [showActions, setShowActions] = useState(false);
  const isUser = item.role === 'user';
  const { width } = useWindowDimensions();
  const maxBubbleWidth = Math.min(width * 0.85, 700);

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
          <Image 
            source={require('../../assets/images/icon.png')} 
            style={[styles.avatar, { borderColor: c.border }]} 
          />
        )}

        <TouchableOpacity
          activeOpacity={0.88}
          onLongPress={handleLongPress}
          delayLongPress={380}
          style={[
            styles.bubble,
            { maxWidth: maxBubbleWidth },
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
            <View>
              <MarkdownRenderer content={item.content} />
              {item.modelName && (
                <Text style={[styles.modelNameTag, { color: c.textSecondary }]}>
                  {item.modelName}
                </Text>
              )}
            </View>
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
}, (prevProps, nextProps) => {
  // Custom comparison to only re-render if message content/loading state changes
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.content === nextProps.item.content &&
    prevProps.item.isLoading === nextProps.item.isLoading &&
    prevProps.c === nextProps.c
  );
});

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
        if (Platform.OS === 'android') {
          // Add a small buffer to prevent the slight overlap
          setKeyboardHeight(e.endCoordinates.height + 12);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        if (Platform.OS === 'android') {
          setKeyboardHeight(0);
        }
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
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
      modelName: MODEL_NAMES[model] || model,
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
        .slice(-20) // Limit history to last 20 messages to reduce payload size & latency
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
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={styles.emptyOrb} 
              />
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
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
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
    width: 80, height: 80, borderRadius: 24,
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 24, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '500' },

  // Messages
  msgRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  avatar: {
    width: 30, height: 30, borderRadius: 8,
    marginRight: 8, borderWidth: 1, flexShrink: 0,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleActive: {
    opacity: 0.85,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  modelNameTag: {
    fontSize: 10,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginTop: 6,
    opacity: 0.6,
  },

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
