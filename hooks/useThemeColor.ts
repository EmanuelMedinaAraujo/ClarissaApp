// Ported from app-example/hooks/useThemeColor.ts
import { ThemeContext } from '@/app/_layout';
import { Colors } from '@/constants/Colors';
import { useContext } from 'react';

export function useThemeColor(
  props: { light?: string; dark?: string; red?: string },
  colorName: keyof typeof Colors.light
): string {
  const themeContext = useContext(ThemeContext);
    const theme = (themeContext?.effectiveTheme ?? 'light') as 'light' | 'dark' | 'red';
  if (props[theme]) {
    return props[theme]!;
  }
  return Colors[theme][colorName];
}
