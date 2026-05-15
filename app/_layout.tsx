import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { useEffect, useState } from 'react';
import { initDB } from '@/src/services/DatabaseService';
import { useAuthStore } from '@/src/store/useAuthStore';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme);
  const isDark = theme === 'dark';
  const { loadSession, isReady } = useAuthStore();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await initDB();
        await loadSession();
      } catch (e) {
        console.error(e);
      } finally {
        setDbReady(true);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (dbReady && isReady) {
      SplashScreen.hideAsync();
    }
  }, [dbReady, isReady]);

  if (!dbReady || !isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
