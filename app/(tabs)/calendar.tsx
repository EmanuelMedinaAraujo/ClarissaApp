import { ThemeContext } from '@/app/_layout';
import CalendarEditorModal from '@/components/calendar/CalendarEditorModal';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { BloodFlow, Entry, SymptomKey, toLocalDateKey } from '@/data/models/menstruation';
import { createSQLiteStorage } from '@/data/storage/sqliteStorage';
import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
	Platform,
	StyleSheet,
	View
} from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
	const insets = useSafeAreaInsets();
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

	// Visible month state
	const today = new Date();
	const [visible, setVisible] = useState<{ year: number; month1: number }>(
		{ year: today.getFullYear(), month1: today.getMonth() + 1 }
	);

	// Entries cache for current month range
	const [entries, setEntries] = useState<Entry[]>([]);

	// Modal editor state
	const [editingKey, setEditingKey] = useState<string | null>(null);
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
			// Use the theme tint/selection color to make today's number distinct when blood flow is shown
			// For the red theme, today's number should be white per design.
			const dayTextColor = isToday ? (themeName === 'red' ? '#fff' : selectionColor) : defaultTextColor;
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
			// Subtle selection ring for currently editing day
			out[editingKey] = {
				...(out[editingKey] ?? {}),
				selected: true,
				selectedColor: selectionColor,
			} as any;
		}

		// Replace the default 'today' indicator with a tint ring.
		const todayKey = toLocalDateKey(new Date());
		if (out[todayKey]) {
			// If there's already a blood-flow marker, add a ring and ensure text uses the correct today color
			const todayColor = themeName === 'red' ? '#fff' : selectionColor;
			out[todayKey].customStyles = {
				container: {
					...out[todayKey].customStyles?.container,
					borderWidth: 2,
					borderColor: todayColor,
					borderRadius: out[todayKey].customStyles?.container?.borderRadius ?? 6,
				},
				text: {
					...out[todayKey].customStyles?.text,
					color: todayColor,
					fontWeight: '600',
				},
			};
		} else {
			// No blood-flow marker: show only the ring around the day number
			const todayColor = themeName === 'red' ? '#fff' : selectionColor;
			out[todayKey] = {
				customStyles: {
					container: {
						backgroundColor: 'transparent',
						borderWidth: 2,
						borderColor: todayColor,
						borderRadius: 6,
					},
					text: {
						color: todayColor,
						fontWeight: '600',
					},
				},
			} as any;
		}

		return out;
	}, [entries, flowPalette, themeName, tint, editingKey]);

	const calendarTheme = useMemo(() => ({
		backgroundColor: Colors[themeName].background,
		calendarBackground: Colors[themeName].background,
		textSectionTitleColor: Colors[themeName].text,
		monthTextColor: Colors[themeName].text,
		// correct prop name expected by react-native-calendars
		textDayColor: Colors[themeName].text,
		textDisabledColor: Colors[themeName].border ?? (themeName === 'dark' ? '#777' : '#c1c1c1'),
		todayTextColor: tint,
		arrowColor: tint,
		selectedDayBackgroundColor: tint,
		selectedDayTextColor: themeName === 'dark' ? '#000' : '#fff',
		dotColor: tint,
		selectedDotColor: themeName === 'dark' ? '#000' : '#fff',
		// ensure month/day fonts contrast
		textDayFontWeight: '500' as const,
		textMonthFontWeight: '700' as const,
		textDayHeaderFontWeight: '600' as const,
	}), [bg, themeName, tint]);

		const onDayPress = useCallback(async (d: DateData) => {
		const key = d.dateString; // YYYY-MM-DD
		setEditingKey(key);
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

		return (
			<ThemedView style={styles.container}>
				<SafeAreaView style={{ flex: 1 }} edges={['top']}>
					<CalendarHeader styles={styles} themeName={themeName} />
					<View style={styles.calendarWrap}>
						<Calendar
							key={themeName}
							theme={calendarTheme}
							current={startOfMonth(visible.year, visible.month1)}
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
				</SafeAreaView>

								<CalendarEditorModal
									visibleKey={editingKey}
									onClose={closeModal}
									onSave={save}
									saving={saving}
									themeName={themeName}
									insetsTop={insets.top}
									formFlow={formFlow}
									setFormFlow={setFormFlow}
									formSymptoms={formSymptoms}
									toggleSymptom={toggleSymptom}
									formNotes={formNotes}
									setFormNotes={setFormNotes}
									formPill={formPill}
									setFormPill={setFormPill}
									styles={styles}
								/>
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
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '700',
	},
	calendarWrap: {
		padding: 8,
		paddingBottom: 16,
	},
	calendar: {
		borderRadius: 12,
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
});
