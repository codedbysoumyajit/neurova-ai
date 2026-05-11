import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const { login, loginAsGuest } = useAuthStore();
  const router = useRouter();

  const handleEmail = () => {
    if (!email.trim()) return;
    login(email.trim());
    router.replace('/(main)');
  };

  const handleGuest = () => {
    loginAsGuest();
    router.replace('/(main)');
  };

  return (
    <View style={styles.container}>
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0E1A' }]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Animated.View entering={FadeInDown.duration(800).springify()} style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>N</Text>
            </View>
            <Text style={styles.title}>Neurova AI</Text>
            <Text style={styles.subtitle}>Your intelligent companion</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInUp.delay(300).duration(800).springify()} style={styles.formWrap}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#555D75"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleEmail} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>Continue with Email</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.ghostBtn} onPress={handleGuest} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>Continue as Guest</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(79,142,247,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(79,142,247,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: { fontSize: 36, fontWeight: '700', color: '#4F8EF7' },
  title: { fontSize: 32, fontWeight: '700', color: '#F0F2F5', letterSpacing: 0.5 },
  subtitle: { fontSize: 16, color: '#8B93A7', marginTop: 6 },
  formWrap: { gap: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#8B93A7', marginBottom: 2, marginLeft: 4 },
  input: {
    backgroundColor: '#1C2236',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#F0F2F5',
    borderWidth: 1,
    borderColor: '#2A3050',
  },
  primaryBtn: {
    backgroundColor: '#4F8EF7',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4F8EF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2A3050' },
  dividerText: { marginHorizontal: 16, color: '#555D75', fontSize: 14 },
  ghostBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2A3050',
  },
  ghostBtnText: { fontSize: 16, fontWeight: '600', color: '#8B93A7' },
});
