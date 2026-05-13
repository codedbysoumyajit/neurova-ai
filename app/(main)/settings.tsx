import { useSettingsStore } from '@/src/store/useSettingsStore';
import { useTheme } from '@/src/theme/useTheme';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const MODELS = [
  // Gemini API
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', speed: '🧠 High', provider: 'Google' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', speed: '⚡ Fast', provider: 'Google' },

  // OpenRouter API
  { id: 'openai/gpt-oss-120b:free', name: 'GPT OSS 120B', speed: '🧠 High', provider: 'Open AI' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super', speed: '🚀 Ultra', provider: 'NVIDIA' },
  { id: 'minimax/minimax-m2.5:free', name: 'MiniMax M2.5', speed: '🧠 Smart', provider: 'MiniMax' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', speed: '⚡ Fast', provider: 'Meta' },
  { id: 'qwen/qwen3-coder:free', name: 'Qwen 3 Coder', speed: '💻 Code', provider: 'Qwen' },
];

export default function SettingsScreen() {
  const {
    theme,
    toggleTheme,
    model,
    setModel,
    geminiApiKey,
    setGeminiApiKey,
    openRouterApiKey,
    setOpenRouterApiKey,
  } = useSettingsStore();
  const c = useTheme();
  const isDark = theme === 'dark';

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      {/* Theme */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.cardRow}>
          <Text style={[styles.cardLabel, { color: c.text }]}>
            {isDark ? '🌙' : '☀️'} Dark Mode
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#D1D5DB', true: c.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Model Selection */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>Model</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        {MODELS.map((m) => {
          const isActive = model === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.modelItem,
                {
                  backgroundColor: isActive ? c.primaryGlow : 'transparent',
                  borderColor: isActive ? c.primary + '50' : c.border,
                },
              ]}
              onPress={() => setModel(m.id)}
              activeOpacity={0.7}
            >
              <View style={styles.modelInfo}>
                <Text style={[styles.modelName, { color: isActive ? c.primary : c.text }]}>
                  {m.name}
                </Text>
                <Text style={[styles.modelMeta, { color: c.textSecondary }]}>
                  {m.speed} · {m.provider}
                </Text>
              </View>
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: c.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* API Keys */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>API Keys</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.keyLabel, { color: c.textSecondary }]}>Gemini API Key</Text>
        <TextInput
          style={[styles.keyInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          placeholder="AIzaSy..."
          placeholderTextColor={c.textSecondary}
          value={geminiApiKey}
          onChangeText={setGeminiApiKey}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={[styles.keyLabel, { color: c.textSecondary, marginTop: 16 }]}>OpenRouter API Key</Text>
        <TextInput
          style={[styles.keyInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          placeholder="sk-or-v1-..."
          placeholderTextColor={c.textSecondary}
          value={openRouterApiKey}
          onChangeText={setOpenRouterApiKey}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: c.primaryGlow, borderColor: c.primary + '30' }]}>
        <Text style={[styles.infoText, { color: c.primary }]}>
          💡 Get a free Gemini API key at{' '}
          <Text style={{ fontWeight: '700' }}>aistudio.google.com</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 24, marginLeft: 4 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  cardLabel: { fontSize: 16, fontWeight: '500' },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modelInfo: { flex: 1 },
  modelName: { fontSize: 15, fontWeight: '600' },
  modelMeta: { fontSize: 13, marginTop: 2 },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
  keyLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4, paddingHorizontal: 18, paddingTop: 16 },
  keyInput: {
    marginHorizontal: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 24,
  },
  infoText: { fontSize: 14, lineHeight: 20 },
});
