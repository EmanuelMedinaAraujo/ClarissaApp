import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { BloodFlow, SymptomKey } from '@/data/models/menstruation';
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visibleKey: string | null;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  themeName: keyof typeof Colors;
  insetsTop?: number;
  formFlow: BloodFlow;
  setFormFlow: React.Dispatch<React.SetStateAction<BloodFlow>>;
  formSymptoms: Set<SymptomKey>;
  toggleSymptom: (k: SymptomKey) => void;
  formNotes: string;
  setFormNotes: (s: string) => void;
  formPill: boolean;
  setFormPill: (b: boolean) => void;
  styles: any;
};

const SYMPTOMS: SymptomKey[] = ['cramps', 'vomiting', 'headache', 'moodChanges'];

export default function CalendarEditorModal(props: Props) {
  const insets = useSafeAreaInsets();
  const top = props.insetsTop ?? insets.top;

  function isTodayKey(key: string): boolean {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return key === `${year}-${month}-${day}`;
  }

  return (
    <Modal
      visible={!!props.visibleKey}
      animationType="slide"
      onRequestClose={props.onClose}
      onDismiss={props.onClose}
      statusBarTranslucent
      presentationStyle="pageSheet"
    >
      <ThemedView style={props.styles.modalRoot}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View
            style={[
              props.styles.modalHeader,
              {
                paddingTop: top + (Platform.OS === 'ios' ? 12 : 8),
                borderBottomColor: Colors[props.themeName].border,
              },
            ]}
          >
            <TouchableOpacity onPress={props.onClose} accessibilityRole="button">
              <ThemedText style={[props.styles.modalHeaderBtn, { color: Colors[props.themeName].tint }]}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText style={props.styles.modalTitle}>{props.visibleKey}</ThemedText>
            <TouchableOpacity onPress={props.onSave} disabled={props.saving} accessibilityRole="button">
              <ThemedText style={[props.styles.modalHeaderBtn, { color: props.saving ? '#999' : Colors[props.themeName].tint }]}>
                {props.saving ? 'Saving…' : 'Save'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView contentContainerStyle={props.styles.formContent} keyboardShouldPersistTaps="handled">
              <View style={props.styles.section}>
                <ThemedText style={props.styles.sectionLabel}>Blood flow</ThemedText>
                <View style={props.styles.segmentRow}>
                  {[
                    { label: 'Light', val: BloodFlow.Light },
                    { label: 'Medium', val: BloodFlow.Medium },
                    { label: 'Heavy', val: BloodFlow.Heavy },
                  ].map(item => {
                    const selected = props.formFlow === item.val;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        onPress={() => props.setFormFlow(prev => (prev === item.val ? BloodFlow.None : item.val))}
                        style={[
                          props.styles.segmentBtn,
                          { borderColor: Colors[props.themeName].border },
                          selected && { backgroundColor: Colors[props.themeName].tint, borderColor: Colors[props.themeName].tint },
                        ]}
                      >
                        <ThemedText style={[props.styles.segmentText, selected && { color: props.themeName === 'dark' ? '#000' : '#fff' }]}>
                          {item.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {props.visibleKey && isTodayKey(props.visibleKey) && (
                <View style={props.styles.section}>
                  <View style={props.styles.rowBetween}>
                    <ThemedText style={props.styles.sectionLabel}>Pill taken today</ThemedText>
                    <Switch value={props.formPill} onValueChange={props.setFormPill} thumbColor={Platform.OS === 'android' ? Colors[props.themeName].tint : undefined} />
                  </View>
                </View>
              )}

              <View style={props.styles.section}>
                <ThemedText style={props.styles.sectionLabel}>Symptoms</ThemedText>
                <View style={props.styles.chipsWrap}>
                  {SYMPTOMS.map((k) => {
                    const active = props.formSymptoms.has(k);
                    return (
                      <TouchableOpacity
                        key={k}
                        onPress={() => props.toggleSymptom(k)}
                        style={[
                          props.styles.chip,
                          { borderColor: Colors[props.themeName].border },
                          active && { backgroundColor: Colors[props.themeName].card, borderColor: Colors[props.themeName].tint },
                        ]}
                      >
                        <ThemedText style={[props.styles.chipText, active && { color: Colors[props.themeName].tint, fontWeight: '600' }]}>
                          {k}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={props.styles.section}>
                <ThemedText style={props.styles.sectionLabel}>Notes</ThemedText>
                <TextInput
                  value={props.formNotes}
                  onChangeText={props.setFormNotes}
                  placeholder="Add notes…"
                  placeholderTextColor={props.themeName === 'dark' ? '#9AA0A6' : '#98A1A8'}
                  multiline
                  numberOfLines={4}
                  style={[
                    props.styles.notes,
                    {
                      color: Colors[props.themeName].text,
                      backgroundColor: Colors[props.themeName].card,
                      borderColor: Colors[props.themeName].border,
                    },
                  ]}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({});
