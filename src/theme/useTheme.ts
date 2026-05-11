import { Colors, ThemeColors } from './colors';
import { useSettingsStore } from '../store/useSettingsStore';

export function useTheme(): ThemeColors {
  const theme = useSettingsStore((s) => s.theme);
  return theme === 'dark' ? Colors.dark : Colors.light;
}

export function useIsDark(): boolean {
  return useSettingsStore((s) => s.theme) === 'dark';
}
