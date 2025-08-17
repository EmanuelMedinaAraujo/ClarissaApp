// Ported from app-example/components/ThemedText.tsx
import { useThemeColor } from '@/hooks/useThemeColor';
import * as React from 'react';
import { Text as DefaultText, TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  redColor?: string;
};

export function ThemedText(props: ThemedTextProps) {
  const { style, lightColor, darkColor, redColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor, red: redColor }, 'text');
  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}
