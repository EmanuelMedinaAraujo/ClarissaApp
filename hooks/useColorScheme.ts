// Ported from app-example/hooks/useColorScheme.ts
import { useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export function useColorScheme(): 'light' | 'dark' | 'red' {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | 'red'>(
    (Appearance.getColorScheme() as 'light' | 'dark' | null) ?? 'light'
  );

  useEffect(() => {
    const listener = (preferences: { colorScheme: ColorSchemeName }) => {
      if (preferences.colorScheme === 'light' || preferences.colorScheme === 'dark') {
        setColorScheme(preferences.colorScheme);
      }
    };
    const subscription = Appearance.addChangeListener(listener);
    return () => {
      subscription.remove();
    };
  }, []);

  return colorScheme;
}
