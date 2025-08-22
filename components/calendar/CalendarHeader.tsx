import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import React from 'react';
import { View } from 'react-native';

type Props = {
  styles: any;
  themeName: keyof typeof Colors;
};

export default function CalendarHeader({ styles, themeName }: Props) {
  return (
    <View style={[styles.header, { borderBottomColor: Colors[themeName].border }]}> 
      <ThemedText style={styles.headerTitle}>Calendar</ThemedText>
    </View>
  );
}
