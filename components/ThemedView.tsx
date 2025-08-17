// Ported from app-example/components/ThemedView.tsx
import { useThemeColor } from '@/hooks/useThemeColor';
import * as React from 'react';
import { View as DefaultView, ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  redColor?: string;
};

export function ThemedView(props: ThemedViewProps) {
  const { style, lightColor, darkColor, redColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor, red: redColor }, 'background');
  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
