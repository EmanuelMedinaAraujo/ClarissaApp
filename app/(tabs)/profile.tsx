import { ThemeContext } from '@/app/_layout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { createSQLiteStorage, type PillConfig } from '@/data/storage/sqliteStorage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AppEvents, events } from '@/logic/eventBus';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const themeOptions: Array<'light' | 'dark' | 'red' | 'system'> = ['light', 'dark', 'red', 'system'];

export default function ProfileScreen() {
	const themeContext = useContext(ThemeContext);
	const systemTheme = useColorScheme();
	if (!themeContext) return null;
	const { theme, setTheme } = themeContext;

	// If theme is 'system', use systemTheme for display
	const effectiveTheme = theme === 'system' ? systemTheme : theme;

	// Pill config state
	const [cfg, setCfg] = useState<PillConfig>({ cycleLength: 21, breakLength: 7, firstPillDate: null });
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const storageRef = useRef<Awaited<ReturnType<typeof createSQLiteStorage>> | null>(null);
	const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [keyboardVisible, setKeyboardVisible] = useState(false);

	const themeName = themeContext.effectiveTheme;

	useEffect(() => {
		let mounted = true;
		(async () => {
			const s = await createSQLiteStorage();
			if (!mounted) return;
			storageRef.current = s;
			const current = await s.getPillConfig();
			if (!mounted) return;
			setCfg(current);
			setLoading(false);
		})();
		return () => { mounted = false; };
	}, []);

	useEffect(() => {
		const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
		const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
		return () => { show.remove(); hide.remove(); };
	}, []);

	const persist = async (next: PillConfig) => {
		if (!storageRef.current) return;
		setSaving(true);
		try {
			const cycle = Math.min(60, Math.max(1, Math.floor(next.cycleLength)));
			const brk = Math.min(21, Math.max(0, Math.floor(next.breakLength)));
			const first = next.firstPillDate && /^\d{4}-\d{2}-\d{2}$/.test(next.firstPillDate) ? next.firstPillDate : null;
			const sanitized: PillConfig = { cycleLength: cycle, breakLength: brk, firstPillDate: first };
			await storageRef.current.savePillConfig(sanitized);
			setCfg(sanitized);
			// notify other screens (e.g., Calendar) to refresh indicators
			events.emit(AppEvents.PillConfigChanged, sanitized);
		} finally {
			setSaving(false);
		}
	};

	const schedulePersist = (next: PillConfig) => {
		setCfg(next);
		if (saveTimer.current) clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => { persist(next); }, 500);
	};

	const useToday = () => {
		const d = new Date();
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		schedulePersist({ ...cfg, firstPillDate: key });
	};

	function onNumberSubmit(attr: keyof PillConfig, max: number, min = 1) {
		return (e: { nativeEvent: { text: string } }): void => {
			const raw = e.nativeEvent.text.replace(/[^0-9]/g, '');
			const n = parseInt(raw, 10);
			const value = isNaN(n) ? min : n;
			const sanitized = Math.min(max, Math.max(min, Math.floor(value)));
			// assign to the requested attribute
			persist({ ...cfg, [attr]: sanitized } as PillConfig);
			dismissKeyboard();
		};
	}

	// Native date picker
	const [showPicker, setShowPicker] = useState(false);
	const [pickerDate, setPickerDate] = useState<Date>(new Date());

	useEffect(() => {
		if (cfg.firstPillDate) {
			// Parse YYYY-MM-DD safely
			const [y, m, d] = cfg.firstPillDate.split('-').map(Number);
			if (y && m && d) setPickerDate(new Date(y, m - 1, d));
		} else {
			setPickerDate(new Date());
		}
	}, [cfg.firstPillDate]);

	const openPicker = () => {
		if(showPicker){
			setShowPicker(false);
			return;
		}
		// Ensure picker reflects current config
		if (cfg.firstPillDate) {
			const [y, m, d] = cfg.firstPillDate.split('-').map(Number);
			if (y && m && d) setPickerDate(new Date(y, m - 1, d));
		} else {
			setPickerDate(new Date());
		}
		setShowPicker(true);
	};

	const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
			// If the user dismissed the dialog, close it and do nothing.
			const type = (event && (event as any).type) || undefined;
			if (type === 'dismissed') {
				setShowPicker(false);
				return;
			}

			// If a valid date was provided, update the local picker state and persist.
			if (selectedDate) {
				setPickerDate(selectedDate);
				const y = selectedDate.getFullYear();
				const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
				const d = String(selectedDate.getDate()).padStart(2, '0');
				const key = `${y}-${m}-${d}`;
				schedulePersist({ ...cfg, firstPillDate: key });
			}

			// On Android the dialog sends type === 'set' when the user confirms the final selection.
			// Close the picker in that case. For iOS (inline) keep it visible while navigating months/years.
			if (Platform.OS === 'android' && type === 'set') {
				setShowPicker(false);
			}
		};

	const dismissKeyboard = () => Keyboard.dismiss();

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={{ flex: 1, width: '100%' }}>
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
			<ThemedText style={styles.title}>Profile</ThemedText>
			<View style={styles.selectorRow}>
				{themeOptions.map(option => (
					<TouchableOpacity
						key={option}
						style={[styles.button, theme === option && styles.selectedButton]}
						onPress={() => setTheme(option)}
					>
						<ThemedText style={styles.buttonText}>
							{option === 'system' ? `System` : option.charAt(0).toUpperCase() + option.slice(1)}
						</ThemedText>
					</TouchableOpacity>
				))}
			</View>

			{/* Pill cycle configuration */}
			<View style={[styles.configCard, { backgroundColor: Colors[themeName].card, borderColor: Colors[themeName].border }]}> 
				<ThemedText style={styles.configTitle}>Pill cycle</ThemedText>
				<View style={styles.row}> 
					<View style={styles.field}> 
						<ThemedText style={styles.label}>Active days</ThemedText>
						<TextInput
							keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
							defaultValue={String(cfg.cycleLength ?? '21')}
							returnKeyType="done"
							onSubmitEditing={onNumberSubmit('cycleLength', 365, 1)}
							style={[styles.input, { borderColor: Colors[themeName].border, color: Colors[themeName].text }]}
						/>
					</View>
					<View style={styles.field}> 	
						<ThemedText style={styles.label}>Break days</ThemedText>
						<TextInput
							keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
							defaultValue={String(cfg.breakLength ?? '7')}
							returnKeyType="done"
							onSubmitEditing={onNumberSubmit('breakLength', 21, 0)}
							style={[styles.input, { borderColor: Colors[themeName].border, color: Colors[themeName].text }]}
						/>
					</View>
				</View>
				<View style={styles.field}> 
					<ThemedText style={styles.label}>First pill day</ThemedText>
					<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}> 
						<TouchableOpacity onPress={openPicker} style={[styles.input, { flex: 1, borderColor: Colors[themeName].border, backgroundColor: Colors[themeName].card }]}> 
							<ThemedText>
								{cfg.firstPillDate
									? (() => {
										const [y, m, d] = cfg.firstPillDate.split('-');
										return `${d}-${m}-${y}`;
									})()
									: 'Select date'}
							</ThemedText>
						</TouchableOpacity>
						<TouchableOpacity onPress={useToday} style={[styles.smallBtn, { borderColor: Colors[themeName].border }]}> 
							<ThemedText style={[styles.smallBtnText, { color: Colors[themeName].tint }]}>Use today</ThemedText>
						</TouchableOpacity>
					</View>
					{showPicker && (
						<DateTimePicker
							value={pickerDate}
							mode="date"
							display={Platform.OS === 'ios' ? 'spinner' : 'default'}
							textColor={Colors[themeName].text}
							onChange={onPickerChange}
							maximumDate={new Date(2100, 11, 31)}
							minimumDate={new Date(2000, 0, 1)}
						/>
					)}
				</View>
				{keyboardVisible && (
					<TouchableOpacity onPress={dismissKeyboard} style={[styles.smallBtn, { alignSelf: 'flex-end', marginTop: 4, borderColor: Colors[themeName].border }]}> 
						<ThemedText style={[styles.smallBtnText, { color: Colors[themeName].tint }]}>Close keyboard</ThemedText>
					</TouchableOpacity>
				)}
			</View>
			</ScrollView>
			</KeyboardAvoidingView>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 12,
	},
	subtitle: {
		fontSize: 16,
		marginBottom: 24,
	},
	selectorRow: {
		flexDirection: 'row',
	},
	configCard: {
		width: '100%',
		marginTop: 24,
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 16,
		gap: 12,
	},
	configTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 4,
	},
	row: {
		flexDirection: 'row',
		gap: 12,
	},
	field: {
		flex: 1,
		gap: 6,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		opacity: 0.8,
	},
	input: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: Platform.OS === 'ios' ? 10 : 8,
	},
	smallBtn: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	smallBtnText: {
		fontSize: 13,
		fontWeight: '600',
	},
	hint: {
		fontSize: 12,
		opacity: 0.7,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	modalCard: {
		width: '100%',
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: 'hidden',
	},
	modalHeader: {
		paddingHorizontal: 12,
		paddingVertical: Platform.OS === 'ios' ? 12 : 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	modalHeaderBtn: {
		fontSize: 16,
		fontWeight: '600',
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: '700',
	},
	pickerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
	},
	pickerCol: {
		flex: 1,
		gap: 8,
	},
	stepRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	stepBtn: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		minWidth: 40,
		alignItems: 'center',
	},
	stepText: {
		fontSize: 18,
		fontWeight: '700',
	},
	valueText: {
		minWidth: 48,
		textAlign: 'center',
		fontWeight: '600',
	},
	button: {
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderRadius: 8,
		backgroundColor: '#eee',
		marginRight: 6,
	},
	selectedButton: {
		backgroundColor: '#e53935',
	},
	buttonText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#7b1f2b',
	},
	systemButton: {
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderRadius: 8,
		backgroundColor: '#b71c1c',
		marginVertical: 8,
	},
	info: {
		fontSize: 14,
		marginTop: 8,
	},
});
