import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import React, { createContext, useMemo, useState } from "react";
import { SafeAreaProvider } from 'react-native-safe-area-context';

export type ThemeContextType = {
  theme: 'light' | 'dark' | 'red' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'red' | 'system') => void;
  systemTheme: 'light' | 'dark' | 'red';
  effectiveTheme: 'light' | 'dark' | 'red';
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export default function RootLayout() {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark' | 'red' | 'system'>('system');
  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  const value = useMemo(() => ({ theme, setTheme, systemTheme, effectiveTheme }), [theme, setTheme, systemTheme, effectiveTheme]);

  // StatusBar style and background based on theme
  const statusBarStyle = effectiveTheme === 'light' ? 'dark' : 'light';
  const statusBarBg = Colors[effectiveTheme].background;

  return (
    <ThemeContext.Provider value={value}>
      <SafeAreaProvider>
        <StatusBar style={statusBarStyle} backgroundColor={statusBarBg} />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}
