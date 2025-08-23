import { ThemeContext } from '@/app/_layout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { BloodFlow, Entry, SymptomKey, toLocalDateKey } from '@/data/models/menstruation';
import { createSQLiteStorage } from '@/data/storage/sqliteStorage';
import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

type MarkedDates = {
	[date: string]: {
		customStyles?: {
			container?: any;
			text?: any;
		};
		// Allow combining selected if needed later
		selected?: boolean;
		selectedColor?: string;
	};
};

const SYMPTOMS: SymptomKey[] = ['cramps', 'vomiting', 'headache', 'moodChanges'];

function startOfMonth(year: number, month1: number): string {
	// month1 is 1-based
	const d = new Date(year, month1 - 1, 1);
	return toLocalDateKey(d);
}
function endOfMonth(year: number, month1: number): string {
	// JS Date: day 0 of next month = last day of current month
	const d = new Date(year, month1, 0);
	return toLocalDateKey(d);
}

function isTodayKey(key: string): boolean {
	return key === toLocalDateKey(new Date());
}

export default function CalendarScreen() {
	const themeCtx = useContext(ThemeContext);
	const themeName = themeCtx?.effectiveTheme ?? 'light';
	const bg = useThemeColor({}, 'background');
	const textColor = useThemeColor({}, 'text');
	const tint = Colors[themeName].tint ?? '#4a90e2';
	// Use a different selection color for the red theme so selected days stand out
	const selectionColor = themeName === 'red' ? (Colors.red.highlight ?? tint) : tint;

	// Storage service
	const storageRef = useRef<Awaited<ReturnType<typeof createSQLiteStorage>> | null>(null);
	const [ready, setReady] = useState(false);

	// Visible month / current displayed date
	const today = new Date();
	const todayKey = toLocalDateKey(today);
	const [visible, setVisible] = useState<{ year: number; month1: number }>(
		{ year: today.getFullYear(), month1: today.getMonth() + 1 }
	);
	const [currentDate, setCurrentDate] = useState<string>(todayKey);

	// Entries cache for current month range
	const [entries, setEntries] = useState<Entry[]>([]);

	// Inline editor state
	const [editingKey, setEditingKey] = useState<string | null>(todayKey);
		const [formFlow, setFormFlow] = useState<BloodFlow>(BloodFlow.None);
	const [formSymptoms, setFormSymptoms] = useState<Set<SymptomKey>>(new Set());
	const [formNotes, setFormNotes] = useState('');
	const [formPill, setFormPill] = useState(false);
	const [saving, setSaving] = useState(false);

	// Init storage once
	useEffect(() => {
		let mounted = true;
		(async () => {
			const s = await createSQLiteStorage();
			if (!mounted) return;
			storageRef.current = s;
			setReady(true);
		})();
		return () => { mounted = false; };
	}, []);

	// Load entries when visible month changes and storage ready
	useEffect(() => {
		if (!ready || !storageRef.current) return;
		const s = storageRef.current;
		const start = startOfMonth(visible.year, visible.month1);
		const end = endOfMonth(visible.year, visible.month1);
		(async () => {
			const rows = await s.listEntriesInRange(start, end);
			setEntries(rows);
		})();
	}, [ready, visible.year, visible.month1]);

	// keyboard state & scroll refs for the inline form
	const scrollRef = useRef<ScrollView | null>(null);
	const notesInputRef = useRef<TextInput | null>(null);
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	useEffect(() => {
		const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
		const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
		return () => { show.remove(); hide.remove(); };
	}, []);

		// When the keyboard becomes visible, scroll the outer ScrollView to the bottom
		useEffect(() => {
			if (!keyboardVisible) return;
			const t = setTimeout(() => {
				scrollRef.current?.scrollToEnd({ animated: true });
			}, 0);
			return () => clearTimeout(t);
		}, [keyboardVisible]);

	// Load entry into form whenever editingKey changes (including initial selection)
	useEffect(() => {
		if (!editingKey || !storageRef.current) return;
		let mounted = true;
		(async () => {
			const existing = await storageRef.current!.getEntryByData(editingKey);
			if (!mounted) return;
			setFormFlow(existing?.bloodFlow ?? BloodFlow.None);
			setFormSymptoms(new Set(existing?.symptoms ?? []));
			setFormNotes(existing?.notes ?? '');
			setFormPill(existing?.pillTaken ?? false);
		})();
		return () => { mounted = false; };
	}, [editingKey, ready]);

	const flowPalette = useMemo(() => {
		// Tuned shades per theme for contrast
		if (themeName === 'dark') {
			return {
				[BloodFlow.None]: 'transparent',
				[BloodFlow.Light]: '#5e2a31',
				[BloodFlow.Medium]: '#8b3949',
				[BloodFlow.Heavy]: '#c0392b',
			} as Record<BloodFlow, string>;
		}
		if (themeName === 'red') {
			return {
				[BloodFlow.None]: 'transparent',
				[BloodFlow.Light]: '#FFB3BD',
				[BloodFlow.Medium]: '#FF7A8B',
				[BloodFlow.Heavy]: '#FF4D61',
			} as Record<BloodFlow, string>;
		}
		// light
		return {
			[BloodFlow.None]: 'transparent',
			[BloodFlow.Light]: '#FFD1D8',
			[BloodFlow.Medium]: '#FF9AA7',
			[BloodFlow.Heavy]: '#FF5C6B',
		} as Record<BloodFlow, string>;
	}, [themeName]);

	const markedDates: MarkedDates = useMemo(() => {
		const out: MarkedDates = {};
		for (const e of entries) {
			const bgc = flowPalette[e.bloodFlow ?? BloodFlow.None];
			if (bgc === 'transparent') continue;
			const isToday = isTodayKey(e.date);
			// Choose a readable color for day numbers when blood flow is shown.
			// In dark mode, use a slightly dimmer color for non-today days so they don't
			// visually match the 'today' tint (which is white in dark theme).
			const defaultTextColor = themeName === 'dark' ? '#bbb' : Colors[themeName].text;
			// Don't special-case today's text color here — keep default readable color.
			const dayTextColor = defaultTextColor;
			out[e.date] = {
				customStyles: {
					container: {
						backgroundColor: bgc,
						borderRadius: 6,
					},
					text: {
						color: dayTextColor,
						fontWeight: '600',
					},
				},
			};
		}
		if (editingKey) {
			const prev = out[editingKey];
			const ringColor = themeName === 'red' ? '#fff' : selectionColor;
			out[editingKey] = {
				customStyles: {
					container: {
						backgroundColor: prev?.customStyles?.container?.backgroundColor ?? 'transparent',
						borderWidth: 2,
						borderColor: ringColor,
						borderRadius: prev?.customStyles?.container?.borderRadius ?? 6,
					},
					text: {
						color: ringColor,
						fontWeight: '600',
					},
				},
			} as any;
		}

	// Note: do not modify the default 'today' indicator here. Only the editing day gets a custom ring.

		return out;
	}, [entries, flowPalette, themeName, selectionColor, editingKey]);

		// Map entries for quick lookup by date
		const entryMap = useMemo(() => {
			const m = new Map<string, Entry>();
			for (const e of entries) m.set(e.date, e);
			return m;
		}, [entries]);

		// Custom day component to draw date number and pill indicator inside the selection ring
		function DayComponent(props: { date?: DateData; onPress?: (d: DateData) => void }) {
			const { date, onPress } = props;
			if (!date) return null;
			const key = date.dateString;
			const entry = entryMap.get(key);
			const flow = entry?.bloodFlow ?? BloodFlow.None;
			const bgc = flowPalette[flow];
			const isEditing = editingKey === key;
			const ringColor = themeName === 'red' ? '#fff' : selectionColor;
			const textColorForDay = markedDates[key]?.customStyles?.text?.color ?? Colors[themeName].text;
			const pillTaken = entry?.pillTaken ?? false; // default to false (no pill taken)

			return (
				<TouchableOpacity onPress={() => onPress?.(date)} activeOpacity={0.8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
					{/* Border/ring layer (absolute so it doesn't affect layout) */}
					<View style={{
						position: 'absolute',
						width: 36,
						height: 36,
						borderRadius: 6,
						borderWidth: isEditing ? 2 : 0,
						borderColor: isEditing ? ringColor : undefined,
					}} />

					{/* Background/content layer */}
					<View style={{
						width: 36,
						height: 36,
						borderRadius: 6,
						alignItems: 'center',
						justifyContent: 'center',
						backgroundColor: bgc === 'transparent' ? 'transparent' : bgc,
					}}>
						<ThemedText style={{ color: textColorForDay, fontWeight: '600' }}>{date.day}</ThemedText>
					</View>

					{/* Pill indicator: always render (filled if pillTaken, outline if not), fixed at center-bottom */}
					<View style={{ position: 'absolute', bottom: 6, left: '50%', transform: [{ translateX: -4 }] }}>
						{pillTaken ? (
							<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: textColorForDay }} />
						) : (
							<View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: textColorForDay, backgroundColor: 'transparent' }} />
						)}
					</View>
				</TouchableOpacity>
			);
		}

	const calendarTheme = useMemo(() => ({
		backgroundColor: bg,
		calendarBackground: bg,
		textSectionTitleColor: Colors[themeName].text,
		monthTextColor: Colors[themeName].text,
		dayTextColor: Colors[themeName].text,
		textDisabledColor: Colors[themeName].border ?? (themeName === 'dark' ? '#777' : '#c1c1c1'),
		todayTextColor: tint,
		arrowColor: tint,
		selectedDayBackgroundColor: tint,
		selectedDayTextColor: themeName === 'dark' ? '#000' : '#fff',
		dotColor: tint,
		selectedDotColor: themeName === 'dark' ? '#000' : '#fff',
		textDayFontWeight: '500' as const,
		textMonthFontWeight: '700' as const,
		textDayHeaderFontWeight: '600' as const,
	}), [bg, themeName, tint]);

		const onDayPress = useCallback(async (d: DateData) => {
			const key = d.dateString; // YYYY-MM-DD
			setEditingKey(key);
			setCurrentDate(key);
			if (!storageRef.current) return;
			const existing = await storageRef.current.getEntryByData(key);
			setFormFlow(existing?.bloodFlow ?? BloodFlow.None);
			setFormSymptoms(new Set(existing?.symptoms ?? []));
			setFormNotes(existing?.notes ?? '');
			setFormPill(existing?.pillTaken ?? false);
		}, []);

		const onMonthChange = useCallback((m: DateData) => {
		setVisible({ year: m.year, month1: m.month });
	}, []);

	const toggleSymptom = (key: SymptomKey) => {
		setFormSymptoms(prev => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key); else next.add(key);
			return next;
		});
	};

	// Immediate persistence helpers
	const persistField = useCallback(async (updates: Partial<Entry>) => {
		if (!editingKey || !storageRef.current) return;
		const existing = await storageRef.current.getEntryByData(editingKey);
		const merged: Entry = {
			date: editingKey,
			pillTaken: updates.pillTaken ?? existing?.pillTaken ?? false,
			bloodFlow: updates.bloodFlow ?? existing?.bloodFlow ?? BloodFlow.None,
			symptoms: updates.symptoms ?? existing?.symptoms ?? undefined,
			notes: updates.notes ?? existing?.notes ?? undefined,
		};
		await storageRef.current.addOrUpdateEntry(merged);
		// refresh entries for visible month
		const start = startOfMonth(visible.year, visible.month1);
		const end = endOfMonth(visible.year, visible.month1);
		const rows = await storageRef.current.listEntriesInRange(start, end);
		setEntries(rows);
	}, [editingKey, visible.year, visible.month1]);

	// Debounced notes save
	const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const onNotesChange = (text: string) => {
		setFormNotes(text);
		if (notesTimer.current) clearTimeout(notesTimer.current);
		notesTimer.current = setTimeout(() => {
			persistField({ notes: text.trim() ? text : undefined });
		}, 700);
	};

	// flow toggle persisted immediately
	const onFlowToggle = async (val: BloodFlow) => {
		const next = (formFlow === val) ? BloodFlow.None : val;
		setFormFlow(next);
		await persistField({ bloodFlow: next });
	};

	const onPillToggle = async (v: boolean) => {
		setFormPill(v);
		await persistField({ pillTaken: v });
	};

	const onToggleSymptom = async (k: SymptomKey) => {
		setFormSymptoms(prev => {
			const next = new Set(prev);
			if (next.has(k)) next.delete(k); else next.add(k);
			// persist
			persistField({ symptoms: Array.from(next) });
			return next;
		});
	};

	const closeKeyboard = () => Keyboard.dismiss();

	const resetForm = () => {
		setFormFlow(BloodFlow.None);
		setFormSymptoms(new Set());
		setFormNotes('');
		setFormPill(false);
	};

	const closeModal = () => {
		setEditingKey(null);
		resetForm();
	};

	const save = useCallback(async () => {
		if (!editingKey || !storageRef.current) return;
		setSaving(true);
		try {
			const entry: Entry = {
				date: editingKey,
				pillTaken: isTodayKey(editingKey) ? !!formPill : false,
				bloodFlow: formFlow,
				symptoms: Array.from(formSymptoms),
				notes: formNotes.trim() ? formNotes : undefined,
			};
			await storageRef.current.addOrUpdateEntry(entry);
			// refresh cache
			const start = startOfMonth(visible.year, visible.month1);
			const end = endOfMonth(visible.year, visible.month1);
			const rows = await storageRef.current.listEntriesInRange(start, end);
			setEntries(rows);
			closeModal();
		} finally {
			setSaving(false);
		}
	}, [editingKey, formFlow, formSymptoms, formNotes, formPill, visible.year, visible.month1]);

	const goToToday = useCallback(async () => {
		const d = new Date();
		const key = toLocalDateKey(d);
		setVisible({ year: d.getFullYear(), month1: d.getMonth() + 1 });
		setCurrentDate(key);
		setEditingKey(key);
		if (storageRef.current) {
			const existing = await storageRef.current.getEntryByData(key);
			setFormFlow(existing?.bloodFlow ?? BloodFlow.None);
			setFormSymptoms(new Set(existing?.symptoms ?? []));
			setFormNotes(existing?.notes ?? '');
			setFormPill(existing?.pillTaken ?? false);
		}
	}, []);

	const renderHeader = () => (
		<View style={[styles.header, { borderBottomColor: Colors[themeName].border }]}> 
			<ThemedText style={styles.headerTitle}>Calendar</ThemedText>
			<TouchableOpacity onPress={goToToday} accessibilityRole="button">
				<ThemedText style={[styles.headerBtn, { color: Colors[themeName].tint }]}>Today</ThemedText>
			</TouchableOpacity>
		</View>
	);

		return (
			<ThemedView style={styles.container}>
				<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
					<KeyboardAvoidingView
						style={{ flex: 1 }}
						behavior={Platform.OS === 'ios' ? 'padding' : undefined}
						keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
					>
						<ScrollView ref={c => { scrollRef.current = c ?? null; }} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
							{renderHeader()}
							<View style={[styles.calendarWrap, { maxHeight: 420 }]}> 
								<Calendar
									key={`${themeName}-${currentDate}`}
									theme={calendarTheme}
									// control visible month/day via currentDate
									current={currentDate}
									dayComponent={DayComponent}
									markingType="custom"
									markedDates={markedDates}
									onDayPress={onDayPress}
									onMonthChange={onMonthChange}
									enableSwipeMonths
									hideExtraDays={false}
									firstDay={1}
									style={[styles.calendar, { backgroundColor: bg }]}
								/>
							</View>

							{editingKey ? (
								<View style={styles.formContent}>
									{/* Blood flow intensity */}
									<View style={styles.section}>
										<ThemedText style={styles.sectionLabel}>Blood flow</ThemedText>
										<View style={styles.segmentRow}>
											{[
												{ label: 'Light', val: BloodFlow.Light },
												{ label: 'Medium', val: BloodFlow.Medium },
												{ label: 'Heavy', val: BloodFlow.Heavy },
											].map(item => {
												const selected = formFlow === item.val;
												return (
													<TouchableOpacity
														key={item.label}
														onPress={() => onFlowToggle(item.val)}
														style={[
														styles.segmentBtn,
														{ borderColor: Colors[themeName].border },
														selected && { backgroundColor: tint, borderColor: tint },
													]}
													>
														<ThemedText style={[styles.segmentText, selected && { color: themeName === 'dark' ? '#000' : '#fff' }]}>
														{item.label}
													</ThemedText>
													</TouchableOpacity>
													);
												})}
										</View>
									</View>
							
									{/* Pill toggle (available for any selected day) */}
									{editingKey && (
										<View style={styles.section}>
											<View style={styles.rowBetween}>
												<ThemedText style={styles.sectionLabel}>Pill taken</ThemedText>
												<Switch value={formPill} onValueChange={onPillToggle} thumbColor={Platform.OS === 'android' ? tint : undefined} />
											</View>
										</View>
									)}
							
									{/* Symptom chips */}
									<View style={styles.section}>
										<ThemedText style={styles.sectionLabel}>Symptoms</ThemedText>
										<View style={styles.chipsWrap}>
											{SYMPTOMS.map((k) => {
												const active = formSymptoms.has(k);
												return (
													<TouchableOpacity
														key={k}
														onPress={() => onToggleSymptom(k)}
														style={[
														styles.chip,
														{ borderColor: Colors[themeName].border },
														active && { backgroundColor: Colors[themeName].card, borderColor: tint },
													]}
													>
														<ThemedText style={[styles.chipText, active && { color: tint, fontWeight: '600' }]}>
														{k}
														</ThemedText>
													</TouchableOpacity>
													);
												})}
										</View>
									</View>
							
									{/* Notes */}
									<View style={styles.section}>
										<View style={styles.rowBetween}>
											<ThemedText style={styles.sectionLabel}>Notes</ThemedText>
											{/* Always render button to avoid layout shift; hide it visually and make non-interactive when keyboard isn't visible */}
											<TouchableOpacity
												onPress={closeKeyboard}
												style={[styles.closeKeyboardBtn, !keyboardVisible && { opacity: 0 }]}
											>
												<ThemedText style={styles.closeKeyboardText}>Close keyboard</ThemedText>
											</TouchableOpacity>
										</View>
										<TextInput
											ref={r => { notesInputRef.current = r ?? null; }}
											value={formNotes}
											onFocus={() => {
												// scroll the notes into view (scroll the whole screen)
												setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
											}}
											onChangeText={onNotesChange}
											placeholder="Add notes…"
											placeholderTextColor={themeName === 'dark' ? '#9AA0A6' : '#98A1A8'}
											multiline
											numberOfLines={4}
											style={[
												styles.notes,
												{
													color: textColor,
													backgroundColor: Colors[themeName].card,
													borderColor: Colors[themeName].border,
												},
											]}
										/>
									</View>
								</View>
							) : (
								<View style={[styles.formPlaceholder, { borderTopColor: Colors[themeName].border }]}> 
									<ThemedText style={styles.placeholderText}>Tap a day to add or edit details</ThemedText>
								</View>
							)}
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</ThemedView>
		);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingTop: 12,
		paddingBottom: 12,
		paddingHorizontal: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '700',
	},
	headerBtn: {
		fontSize: 16,
		fontWeight: '600',
	},
	calendarWrap: {
		padding: 8,
		paddingBottom: 16,
	},
	calendar: {
		borderRadius: 12,
	},
	inlineHeader: {
		paddingTop: 8,
		paddingBottom: 8,
		paddingHorizontal: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	inlineTitle: {
		fontSize: 16,
		fontWeight: '700',
	},
	inlineHeaderBtn: {
		fontSize: 16,
		fontWeight: '600',
	},
	modalRoot: {
		flex: 1,
	},
	modalHeader: {
		paddingTop: Platform.OS === 'ios' ? 12 : 8,
		paddingHorizontal: 12,
		paddingBottom: 8,
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
	formContent: {
		padding: 16,
		gap: 16,
	},
	section: {
		gap: 8,
	},
	sectionLabel: {
		fontSize: 15,
		fontWeight: '600',
	},
	segmentRow: {
		flexDirection: 'row',
		gap: 8,
	},
	segmentBtn: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
	},
	segmentText: {
		fontSize: 14,
	},
	rowBetween: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	chipsWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	chip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
	},
	chipText: {
		fontSize: 14,
	},
	notes: {
		minHeight: 100,
		borderRadius: 8,
		padding: 12,
		borderWidth: StyleSheet.hairlineWidth,
		textAlignVertical: 'top',
	},
		closeKeyboardBtn: {
			marginTop: 8,
			alignSelf: 'flex-end',
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 8,
			borderWidth: StyleSheet.hairlineWidth,
		},
		closeKeyboardText: {
			fontSize: 13,
			fontWeight: '600',
		},
		formPlaceholder: {
			padding: 16,
			borderTopWidth: StyleSheet.hairlineWidth,
			alignItems: 'center',
		},
		placeholderText: {
			fontSize: 14,
			opacity: 0.7,
		},
});
