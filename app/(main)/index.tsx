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
} from 'react-native';
import { useChatStore, Message } from '@/src/store/useChatStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { useTheme } from '@/src/theme/useTheme';
import { AIService, AIMessage } from '@/src/services/AIService';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const isGemini = model.startsWith('gemini');

    if (isGemini && !geminiApiKey) {
      Alert.alert(
        'API Key Required',
        'Please set your Gemini API Key in Settings before using this model.',
        [{ text: 'OK' }]
      );
      return;
    } else if (!isGemini && !openRouterApiKey) {
      Alert.alert(
        'API Key Required',
        'Please set your OpenRouter API Key in Settings before using this model.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Ensure we have an active session
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createSession();
    }

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    addMessage(sessionId, userMsg);
    setInput('');
    scrollToEnd();

    // Add placeholder assistant message
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
      // Build history for context
      const currentMessages = useChatStore.getState().sessions.find((s) => s.id === sessionId)?.messages ?? [];
      const history: AIMessage[] = currentMessages
        .filter((m) => m.content && !m.isLoading)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await AIService.sendMessage(history, model, geminiApiKey, openRouterApiKey);
      updateMessage(sessionId, aiMsgId, response);

      // Auto-rename first message
      if (currentMessages.filter((m) => m.role === 'user').length <= 1) {
        const shortTitle = text.length > 35 ? text.substring(0, 35) + '…' : text;
        renameSession(sessionId, shortTitle);
      }
    } catch (error: any) {
      updateMessage(sessionId, aiMsgId, `⚠️ ${error.message}`);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isUser = item.role === 'user';
      return (
        <Animated.View
          entering={FadeInDown.duration(300).delay(50)}
          style={[
            styles.msgRow,
            { justifyContent: isUser ? 'flex-end' : 'flex-start' },
          ]}
        >
          {/* AI Avatar */}
          {!isUser && (
            <View style={[styles.avatar, { backgroundColor: c.primaryGlow, borderColor: c.primary }]}>
              <Text style={[styles.avatarText, { color: c.primary }]}>N</Text>
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isUser
                ? { backgroundColor: c.userBubble, borderBottomRightRadius: 6 }
                : { backgroundColor: c.aiBubble, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: c.border },
            ]}
          >
            {item.isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={c.primary} />
                <Text style={[styles.loadingText, { color: c.textSecondary }]}>Thinking…</Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.msgText,
                  { color: isUser ? '#fff' : c.text },
                ]}
                selectable
              >
                {item.content}
              </Text>
            )}
          </View>
        </Animated.View>
      );
    },
    [c]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={headerHeight}
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

            {/* Suggestion Chips */}
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
          onContentSizeChange={scrollToEnd}
        />
      )}

      {/* Input Bar */}
      <View style={[
        styles.inputBar, 
        { 
          backgroundColor: c.surface, 
          borderTopColor: c.border,
          paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 12) 
        }
      ]}>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: c.inputBg,
              color: c.text,
              borderColor: c.border,
            },
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
              backgroundColor: input.trim() ? c.primary : c.surfaceLight,
              opacity: loading ? 0.5 : 1,
            },
          ]}
          onPress={handleSend}
          disabled={loading || !input.trim()}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.sendIcon, { color: input.trim() ? '#fff' : c.textSecondary }]}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 8 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyInner: { alignItems: 'center' },
  emptyOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 20,
  },
  emptyOrbText: { fontSize: 32, fontWeight: '700' },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 24, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500' },

  // Messages
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 14 },

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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F8EF7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  sendIcon: { fontSize: 20, fontWeight: '700' },
});
