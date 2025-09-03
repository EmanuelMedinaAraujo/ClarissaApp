import { ThemeContext } from '@/app/_layout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { BloodFlow, Entry, SymptomKey, toLocalDateKey } from '@/data/models/menstruation';
import { createSQLiteStorage, PillConfig } from '@/data/storage/sqliteStorage';
import { useThemeColor } from '@/hooks/useThemeColor';
import { AppEvents, events } from '@/logic/eventBus';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Fixed symptom list used elsewhere
const SYMPTOMS: SymptomKey[] = ['cramps', 'vomiting', 'headache', 'moodChanges'];

export default function TodayScreen() {
	const insets = useSafeAreaInsets();
	const themeCtx = useContext(ThemeContext);
	const themeName = themeCtx?.effectiveTheme ?? 'light';
	const textColor = useThemeColor({}, 'text');
	const cardBg = Colors[themeName].card ?? (themeName === 'light' ? '#f6f8fa' : '#2f363d');
	const borderColor = Colors[themeName].border ?? (themeName === 'dark' ? '#444' : '#e1e4e8');
	const tint = Colors[themeName].tint;
	const highlight = themeName === 'red' ? (Colors.red.highlight ?? tint) : tint;

	// Storage
	const storageRef = useRef<Awaited<ReturnType<typeof createSQLiteStorage>> | null>(null);
	const [ready, setReady] = useState(false);
	const [pillCfg, setPillCfg] = useState<PillConfig | null>(null);

	// Date keys
	const today = new Date();
	const todayKey = toLocalDateKey(today);

	// Today's entry
	const [entry, setEntry] = useState<Entry | null>(null);

	// All entries (for period prediction)
	const [allEntries, setAllEntries] = useState<Entry[] | null>(null);

	// Init storage
	useEffect(() => {
		let mounted = true;
		(async () => {
			const s = await createSQLiteStorage();
			if (!mounted) return;
			storageRef.current = s;
			const cfg = await s.getPillConfig();
			if (!mounted) return;
			setPillCfg(cfg);
			const e = await s.getEntryByDate(todayKey);
			if (!mounted) return;
			setEntry(e);
			const list = await s.loadAllEntries();
			if (!mounted) return;
			setAllEntries(list);
			setReady(true);
		})();
		return () => { mounted = false; };
	}, [todayKey]);

	// Listen to pill config changes (from Profile/Calendar etc.)
	useEffect(() => {
		const off = events.on(AppEvents.PillConfigChanged, async () => {
			if (!storageRef.current) return;
			const cfg = await storageRef.current.getPillConfig();
			setPillCfg(cfg);
		});
		return off;
	}, []);

	// Refresh data whenever the Today tab becomes focused so the UI reflects
	// any changes made elsewhere (Profile, Calendar, notifications, etc.).
	const isFocused = useIsFocused();
	useEffect(() => {
		if (!isFocused || !storageRef.current) return;
		let mounted = true;
		(async () => {
			try {
				const s = storageRef.current!;
				const cfg = await s.getPillConfig();
				if (mounted) setPillCfg(cfg);
				const e = await s.getEntryByDate(todayKey);
				if (mounted) setEntry(e);
				const list = await s.loadAllEntries();
				if (mounted) setAllEntries(list);
				if (mounted) setReady(true);
			} catch (e) {
				// best-effort refresh; ignore errors
			}
		})();
		return () => { mounted = false; };
	}, [isFocused, todayKey]);

	// Helpers
	const daysBetweenKeys = useCallback((startKey: string, endKey: string) => {
		const [sy, sm, sd] = startKey.split('-').map(Number);
		const [ey, em, ed] = endKey.split('-').map(Number);
		const s = new Date(sy, sm - 1, sd);
		const e = new Date(ey, em - 1, ed);
		const ms = e.getTime() - s.getTime();
		return Math.floor(ms / 86400000);
	}, []);

	const pillExpectation: 'pill' | 'break' | null = useMemo(() => {
		if (!pillCfg || !pillCfg.firstPillDate) return null;
		const first = pillCfg.firstPillDate;
		if (todayKey < first) return null;
		const total = Math.max(1, (pillCfg.cycleLength ?? 21) + (pillCfg.breakLength ?? 7));
		const diff = daysBetweenKeys(first, todayKey);
		const dayInCycle = ((diff % total) + total) % total; // safe modulo
		return dayInCycle < (pillCfg.cycleLength ?? 21) ? 'pill' : 'break';
	}, [pillCfg, todayKey, daysBetweenKeys]);

	// Quick persist helpers
	const updateEntry = useCallback(async (updates: Partial<Entry>) => {
		if (!storageRef.current) return;
		const current: Entry = {
			date: todayKey,
			pillTaken: entry?.pillTaken ?? false,
			bloodFlow: entry?.bloodFlow ?? BloodFlow.None,
			symptoms: entry?.symptoms ?? [],
			notes: entry?.notes,
		};
		const next = { ...current, ...updates } as Entry;
		await storageRef.current.addOrUpdateEntry(next);
		setEntry(next);
	}, [entry, todayKey]);

	const togglePill = useCallback(async () => {
		await updateEntry({ pillTaken: !(entry?.pillTaken ?? false) });
	}, [entry, updateEntry]);

	// Toggleable flow: tapping an active flow clears it (-> None)
	const toggleFlow = useCallback(async (flow: BloodFlow) => {
		const current = entry?.bloodFlow ?? BloodFlow.None;
		const next = current === flow ? BloodFlow.None : flow;
		await updateEntry({ bloodFlow: next });
	}, [entry, updateEntry]);

	const toggleSymptom = useCallback(async (key: SymptomKey) => {
		const set = new Set(entry?.symptoms ?? []);
		if (set.has(key)) set.delete(key); else set.add(key);
		await updateEntry({ symptoms: Array.from(set) });
	}, [entry, updateEntry]);

	// Period start inference: a start is a day with flow>None and previous day flow None/undefined
	const periodStarts = useMemo(() => {
		if (!allEntries) return [] as string[];
		const map = new Map(allEntries.map(e => [e.date, e] as const));
		const keys = allEntries.map(e => e.date).sort();
		const starts: string[] = [];
		for (const key of keys) {
			const e = map.get(key)!;
			if ((e.bloodFlow ?? BloodFlow.None) > BloodFlow.None) {
				// prev day
				const [y, m, d] = key.split('-').map(Number);
				const prev = new Date(y, m - 1, d - 1);
				const prevKey = toLocalDateKey(prev);
				const pe = map.get(prevKey);
				if (!pe || (pe.bloodFlow ?? BloodFlow.None) === BloodFlow.None) {
					starts.push(key);
				}
			}
		}
		return starts.sort();
	}, [allEntries]);

	const avgCycleLength = useMemo(() => {
		if (!periodStarts.length) return 28;
		if (periodStarts.length === 1) return 28;
		const deltas: number[] = [];
		for (let i = 1; i < periodStarts.length; i++) {
			deltas.push(daysBetweenKeys(periodStarts[i - 1], periodStarts[i]));
		}
		const avg = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
		return Math.max(21, Math.min(35, avg || 28));
	}, [periodStarts, daysBetweenKeys]);

	const lastPeriodStart = periodStarts.length ? periodStarts[periodStarts.length - 1] : null;

	const predictedNextPeriod = useMemo(() => {
		if (!lastPeriodStart) return null;
		const [y, m, d] = lastPeriodStart.split('-').map(Number);
		const dt = new Date(y, m - 1, d + avgCycleLength);
		return toLocalDateKey(dt);
	}, [lastPeriodStart, avgCycleLength]);

	// Fertility using simple day-14 rule from last period start
	const fertilityInfo = useMemo(() => {
		if (!lastPeriodStart) return null as null | {
			windowStart: string; windowEnd: string; ovulation: string; todayStatus: 'low' | 'moderate' | 'high'
		};
		const [y, m, d] = lastPeriodStart.split('-').map(Number);
		const start = new Date(y, m - 1, d);
		const ovulation = new Date(start);
		ovulation.setDate(ovulation.getDate() + 14);
		const windowStart = new Date(start);
		windowStart.setDate(windowStart.getDate() + 10);
		const windowEnd = new Date(start);
		windowEnd.setDate(windowEnd.getDate() + 15);
		const sKey = toLocalDateKey(windowStart);
		const eKey = toLocalDateKey(windowEnd);
		const oKey = toLocalDateKey(ovulation);

		let todayStatus: 'low' | 'moderate' | 'high' = 'low';
		if (todayKey >= sKey && todayKey <= eKey) todayStatus = 'high';
		else if (todayKey === toLocalDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 9))
			|| todayKey === toLocalDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 16))) todayStatus = 'moderate';

		return { windowStart: sKey, windowEnd: eKey, ovulation: oKey, todayStatus };
	}, [lastPeriodStart, todayKey]);

	// UI helpers
	const formatHuman = (key: string) => {
		const [y, m, d] = key.split('-').map(Number);
		const dt = new Date(y, m - 1, d);
		return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(dt);
	};

	const flowPalette = {
		[BloodFlow.None]: { label: 'None', color: borderColor },
		[BloodFlow.Light]: { label: 'Light', color: themeName === 'red' ? Colors.red.accent : '#6ec1e4' },
		[BloodFlow.Medium]: { label: 'Medium', color: themeName === 'red' ? Colors.red.highlight : tint },
		[BloodFlow.Heavy]: { label: 'Heavy', color: themeName === 'red' ? '#ff8fa3' : '#e57373' },
	} as const;

	const pillDue = pillCfg && pillExpectation === 'pill' && !(entry?.pillTaken);

	return (
		<ThemedView style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}> 
			<ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
				{/* Header with date */}
				<View style={[styles.header, { borderBottomColor: borderColor }]}> 
					<ThemedText style={styles.headerTitle}>
						{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(today)}
					</ThemedText>
				</View>

				{/* Today summary card */}
				<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}> 
					<View style={styles.rowBetween}>
						<View style={{ flex: 1 }}>
							<ThemedText style={styles.cardTitle}>Today</ThemedText>
						</View>
						{pillDue ? (
							<View style={[styles.pillBadge, { backgroundColor: highlight + '22', borderColor: highlight }]}> 
								<MaterialCommunityIcons name="pill" color={highlight} size={18} />
								<ThemedText style={[styles.pillBadgeText, { color: highlight }]}>Pill due</ThemedText>
							</View>
						) : pillExpectation === 'pill' ? (
							<View style={[styles.pillBadge, { backgroundColor: (Colors[themeName].card ?? cardBg), borderColor }]}> 
								<MaterialCommunityIcons name="pill" color={textColor} size={18} />
								<ThemedText style={[styles.pillBadgeText]}>Pill day</ThemedText>
							</View>
						) : null}
					</View>

					{/* Flow */}
					<View style={styles.section}> 
						<ThemedText style={styles.sectionLabel}>Flow</ThemedText>
						<View style={styles.segmentRow}>
							{[BloodFlow.Light, BloodFlow.Medium, BloodFlow.Heavy].map((f) => {
								const active = (entry?.bloodFlow ?? BloodFlow.None) === f;
								const c = flowPalette[f].color;
								return (
									<Pressable key={f} onPress={() => toggleFlow(f)} style={[styles.segmentBtn, {
										borderColor: active ? c : borderColor,
										backgroundColor: active ? (Platform.OS === 'ios' ? c + '33' : c + '22') : 'transparent'
									}]}>
										<ThemedText style={[styles.segmentText]}>{flowPalette[f].label}</ThemedText>
									</Pressable>
								);
							})}
						</View>
					</View>

					{/* Pill quick toggle */}
					<View style={[styles.section, styles.rowBetween]}> 
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
							<MaterialCommunityIcons name="pill" size={20} color={pillDue ? highlight : textColor} />
							<ThemedText style={styles.sectionLabel}>Pill</ThemedText>
							{pillExpectation === 'pill' && (
								<ThemedText style={[styles.muted, { color: textColor }]}>
									{pillDue ? 'Take today' : 'Expected today'}
								</ThemedText>
							)}
						</View>
						<Pressable onPress={togglePill} style={[styles.toggleBtn, {
							borderColor: pillDue ? highlight : borderColor,
							backgroundColor: (entry?.pillTaken ? (themeName === 'dark' ? '#1f6f3a' : '#e6f4ea') : 'transparent'),
						}]}>
							<ThemedText style={[styles.toggleText, { color: entry?.pillTaken ? (themeName === 'dark' ? '#9ef0b5' : '#137333') : textColor }]}> 
								{entry?.pillTaken ? 'Taken' : 'Mark taken'}
							</ThemedText>
						</Pressable>
					</View>

					{/* Symptoms */}
					<View style={styles.section}> 
						<ThemedText style={styles.sectionLabel}>Symptoms</ThemedText>
						<View style={styles.chipsWrap}>
							{SYMPTOMS.map((s) => {
								const active = (entry?.symptoms ?? []).includes(s);
								return (
									<Pressable key={s} onPress={() => toggleSymptom(s)} style={[styles.chip, {
										borderColor: active ? tint : borderColor,
										backgroundColor: active ? tint + '22' : 'transparent',
									}]}>
										<ThemedText style={styles.chipText}>{labelForSymptom(s)}</ThemedText>
									</Pressable>
								);
							})}
						</View>
					</View>
				</View>
				{/* Forecast card */}
				<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}> 
					<ThemedText style={styles.cardTitle}>Insights</ThemedText>
					{/* Fertility */}
					<View style={{ gap: 4}}>
						{fertilityInfo ? (
							<>
							<View style={[styles.rowBetween]}> 
								<ThemedText style={styles.subtleTitle}>Fertile window: </ThemedText>
								<ThemedText style={styles.subtleValue}>
									{formatHuman(fertilityInfo.windowStart)} – {formatHuman(fertilityInfo.windowEnd)}
								</ThemedText>
							</View>
							<View style={[styles.rowBetween]}> 
								<ThemedText style={styles.subtleTitle}>Current fertility: </ThemedText>
								<ThemedText style={styles.subtleValue}>
									{fertilityInfo.todayStatus === 'high' ? 'High fertility' : fertilityInfo.todayStatus === 'moderate' ? 'Moderate fertility' : 'Low fertility'}{fertilityInfo.todayStatus !== 'low' ? ` (ovulation ~ ${formatHuman(fertilityInfo.ovulation)})` : ''}
								</ThemedText>
							</View>
							</>
						) : (
							<ThemedText style={styles.subtleTitle}>Fertility: Not enough data</ThemedText>
						)}
					</View>
					{/* Next period */}
					<View style={[styles.rowBetween, { marginTop: 8 }]}> 
						<ThemedText style={styles.subtleTitle}>Next period</ThemedText>
						<ThemedText style={styles.subtleValue}>
							{predictedNextPeriod ? formatHuman(predictedNextPeriod) : 'Not enough data'}
						</ThemedText>
					</View>
					
				</View>
			</ScrollView>
		</ThemedView>
	);
}

function labelForSymptom(k: SymptomKey): string {
	switch (k) {
		case 'cramps': return '🩺 Cramps';
		case 'vomiting': return '🤢 Nausea';
		case 'headache': return '🤕 Headache';
		case 'moodChanges': return '🙂 Mood';
		default: return k;
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingHorizontal: 16,
		paddingBottom: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: '700',
	},
	card: {
		margin: 16,
		padding: 14,
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		gap: 12,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '700',
	},
	muted: {
		fontSize: 12,
	},
	rowBetween: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
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
		fontWeight: '600',
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
		fontWeight: '500',
	},
	toggleBtn: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
	},
	toggleText: {
		fontSize: 14,
		fontWeight: '600',
	},
	subtleTitle: {
		fontSize: 14,
		opacity: 0.9,
		fontWeight: '600',
	},
	subtleValue: {
		fontSize: 14,
		fontWeight: '700',
	},
	pillBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth,
	},
	pillBadgeText: {
		fontSize: 12,
		fontWeight: '700',
	},
});
