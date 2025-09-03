import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BloodFlow, toLocalDateKey, type SymptomKey } from '@/data/models/menstruation';
import { createSQLiteStorage, type Entry, type PillConfig } from '@/data/storage';
import { useThemeColor } from '@/hooks/useThemeColor';
import { AppEvents, events } from '@/logic/eventBus';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	Animated,
	Easing,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from 'react-native';

type PillState = {
	dayOfCycle: number | null; // 1-based
	isPillDay: boolean | null;
	isBreakDay: boolean | null;
	nextBreakStart: string | null; // YYYY-MM-DD
	currentBreakEnds: string | null; // YYYY-MM-DD
};

type FertilityInfo = {
	cycleStart: string | null; // YYYY-MM-DD
	cycleDay: number | null; // 1-based
	status: 'low' | 'fertile' | 'ovulation' | 'unknown';
	fertileWindow: { start: string; end: string } | null;
	ovulationDay: string | null;
};

const today = new Date();
const todayKey = toLocalDateKey(today);

export default function TodayScreen() {
	// theme colors
	const bg = useThemeColor({}, 'background');
	const text = useThemeColor({}, 'text');
	const card = useThemeColor({}, 'card');
	const border = useThemeColor({}, 'border');
	const tint = useThemeColor({}, 'tint');
	const error = useThemeColor({}, 'error');

	// storage
	const storageRef = useRef<Awaited<ReturnType<typeof createSQLiteStorage>> | null>(null);

	const [loading, setLoading] = useState(true);
	const [entry, setEntry] = useState<Entry | null>(null);
	const [pillCfg, setPillCfg] = useState<PillConfig | null>(null);
	const [fertility, setFertility] = useState<FertilityInfo | null>(null);
	const [pillState, setPillState] = useState<PillState | null>(null);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// simple animate-in
	const fadeIn = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		Animated.timing(fadeIn, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
	}, [fadeIn]);

	// subscribe to pill config changes
	useEffect(() => {
		const off = events.on(AppEvents.PillConfigChanged, () => {
			void loadData();
		});
		return off;
	}, []);

	useEffect(() => {
		void loadData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function ensureStorage() {
		if (!storageRef.current) {
			storageRef.current = await createSQLiteStorage();
		}
		return storageRef.current;
	}

	async function loadData() {
		setLoading(true);
		setErrorMsg(null);
		try {
			const storage = await ensureStorage();
			const [e, cfg] = await Promise.all([
				storage.getEntryByDate(todayKey),
				storage.getPillConfig(),
			]);
			setEntry(e);
			setPillCfg(cfg);
			setPillState(computePillState(cfg, today));
			const fert = await computeFertility(storage);
			setFertility(fert);
		} catch (err: any) {
			setErrorMsg(String(err?.message ?? err ?? 'Unknown error'));
		} finally {
			setLoading(false);
		}
	}

	// Handlers
	const onTogglePill = async () => {
		try {
			const storage = await ensureStorage();
			const current = entry?.pillTaken ?? false;
			const next = !current;
			await storage.recordPillIntake(todayKey, next);
			Haptics.impactAsync(next ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
			setEntry(prev => ({
				date: todayKey,
				pillTaken: next,
				bloodFlow: prev?.bloodFlow ?? BloodFlow.None,
				symptoms: prev?.symptoms ?? [],
				notes: prev?.notes,
			}));
		} catch {}
	};

	const onSetFlow = async (flow: BloodFlow) => {
		try {
			const storage = await ensureStorage();
			await storage.recordBloodFlow(todayKey, flow);
			Haptics.selectionAsync();
			setEntry(prev => ({
				date: todayKey,
				pillTaken: prev?.pillTaken ?? false,
				bloodFlow: flow,
				symptoms: prev?.symptoms ?? [],
				notes: prev?.notes,
			}));
			// fertility might change if this is a new flow start
			const fert = await computeFertility(storage);
			setFertility(fert);
		} catch {}
	};

	const onToggleSymptom = async (key: SymptomKey) => {
		try {
			const storage = await ensureStorage();
			const prevList = entry?.symptoms ?? [];
			const exists = prevList.includes(key);
			const nextList = exists ? prevList.filter(k => k !== key) : [...prevList, key];
			await storage.recordSymptom(todayKey, nextList);
			Haptics.selectionAsync();
			setEntry(prev => ({
				date: todayKey,
				pillTaken: prev?.pillTaken ?? false,
				bloodFlow: prev?.bloodFlow ?? BloodFlow.None,
				symptoms: nextList,
				notes: prev?.notes,
			}));
		} catch {}
	};

	const dateFmt = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }), []);
	const shortDateFmt = useMemo(() => new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }), []);

	const pillDueEmphasis = pillState?.isPillDay && !(entry?.pillTaken);

	return (
		<ThemedView style={{ flex: 1 }}>
			<Animated.View style={{ opacity: fadeIn, flex: 1 }}>
				<ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 36 }]}> 
					{/* Header with gradient */}
					<LinearGradient colors={[tint, card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGrad}>
						<View style={styles.headerRow}>
							  <ThemedText style={[styles.headerTitle]}>{dateFmt.format(today)}</ThemedText>
							  <Ionicons name="calendar-outline" size={24} color={'#fff'} />
						</View>
						{pillDueEmphasis ? (
											<BlurView intensity={40} tint="default" style={[styles.pillBanner, { borderColor: border }]}>
												<Ionicons name="medkit-outline" size={22} color={error} style={{ marginRight: 8 }} />
								<ThemedText style={[styles.pillBannerText]}>Pill is due today</ThemedText>
							</BlurView>
						) : null}
					</LinearGradient>

					{/* Today entry card */}
					<Card>
						<ThemedText style={styles.cardTitle}>Today&apos;s Entry</ThemedText>
						<View style={styles.rowBetween}>
							<Label>Take pill</Label>
							<Pressable onPress={onTogglePill} style={({ pressed }) => [styles.switchPill, { borderColor: border, backgroundColor: pressed ? card : 'transparent' }]}>
								<Ionicons name={entry?.pillTaken ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={entry?.pillTaken ? tint : text} />
							</Pressable>
						</View>

						<View style={[styles.section, { borderTopColor: border }]}>
							<Label>Blood flow</Label>
							<View style={styles.flowRow}>
								{(
									[
										{ label: 'None', val: BloodFlow.None, icon: 'water-off' as const },
										{ label: 'Light', val: BloodFlow.Light, icon: 'water-outline' as const },
										{ label: 'Medium', val: BloodFlow.Medium, icon: 'water' as const },
										{ label: 'Heavy', val: BloodFlow.Heavy, icon: 'water-plus' as const },
									]
								).map(item => (
									<Chip
										key={item.label}
										active={entry?.bloodFlow === item.val}
										onPress={() => onSetFlow(item.val)}
										icon={<MaterialCommunityIcons name={item.icon} size={18} color={entry?.bloodFlow === item.val ? '#fff' : text} />}
										label={item.label}
										tint={tint}
										border={border}
										textColor={text}
									/>
								))}
							</View>
						</View>

						<View style={[styles.section, { borderTopColor: border }]}>
							<Label>Symptoms</Label>
							<View style={styles.flowRow}>
								{(
									[
										{ key: 'cramps' as SymptomKey, icon: 'alpha-c-circle-outline' as const, label: 'Cramps' },
										{ key: 'headache' as SymptomKey, icon: 'head-flash-outline' as const, label: 'Headache' },
										{ key: 'vomiting' as SymptomKey, icon: 'emoticon-sick-outline' as const, label: 'Nausea' },
										{ key: 'moodChanges' as SymptomKey, icon: 'emoticon-neutral-outline' as const, label: 'Mood' },
									]
								).map(s => {
									const active = (entry?.symptoms ?? []).includes(s.key);
									return (
										<Chip
											key={s.key}
											active={active}
											onPress={() => onToggleSymptom(s.key)}
											icon={<MaterialCommunityIcons name={s.icon} size={18} color={active ? '#fff' : text} />}
											label={s.label}
											tint={tint}
											border={border}
											textColor={text}
										/>
									);
								})}
							</View>
						</View>
					</Card>

					{/* Pill cycle card */}
					<Card>
						<ThemedText style={styles.cardTitle}>Pill Cycle</ThemedText>
						{pillCfg && pillState ? (
							<View>
								<View style={styles.rowBetween}>
									<Label>Day of cycle</Label>
									<ThemedText style={styles.valueText}>{pillState.dayOfCycle ?? '—'}</ThemedText>
								</View>
								<View style={[styles.tagsRow, { marginTop: 8 }]}>
									<Tag color={pillState.isBreakDay ? border : tint} text={pillState.isBreakDay ? 'Break day' : 'Active pill day'} icon={pillState.isBreakDay ? 'pause' : 'play'} />
									{!entry?.pillTaken && pillState.isPillDay ? (
										<Tag color={error} text="Pill due" icon="alert" />
									) : null}
								</View>
								<View style={[styles.section, { borderTopColor: border }]}>
									{pillState.isBreakDay ? (
										<ThemedText>Break ends {pillState.currentBreakEnds ? `on ${shortDateFmt.format(new Date(pillState.currentBreakEnds))}` : '—'}</ThemedText>
									) : (
										<ThemedText>Next break starts {pillState.nextBreakStart ? `on ${shortDateFmt.format(new Date(pillState.nextBreakStart))}` : '—'}</ThemedText>
									)}
								</View>
							</View>
						) : (
							<ThemedText style={{ opacity: 0.8 }}>Configure pill cycle to see details</ThemedText>
						)}
					</Card>

					{/* Fertility card */}
					<Card>
						<ThemedText style={styles.cardTitle}>Fertility</ThemedText>
						{fertility ? (
							<View>
								<View style={styles.rowBetween}>
									<Label>Cycle day</Label>
									<ThemedText style={styles.valueText}>{fertility.cycleDay ?? '—'}</ThemedText>
								</View>
												<View style={[styles.tagsRow, { marginTop: 8 }]}>
													<Tag
														color={
															fertility.status === 'ovulation' ? tint : fertility.status === 'fertile' ? border : text
														}
														text={
															fertility.status === 'ovulation' ? 'Ovulation likely' : fertility.status === 'fertile' ? 'Fertile window' : fertility.status === 'low' ? 'Low fertility' : 'Unknown'
														}
														icon={
															fertility.status === 'ovulation'
																? 'sunny-outline'
																: fertility.status === 'fertile'
																? 'flame-outline'
																: fertility.status === 'low'
																? 'leaf-outline'
																: 'help-circle-outline'
														}
													/>
												</View>
								<View style={[styles.section, { borderTopColor: border }]}>
									{fertility.fertileWindow ? (
										<ThemedText>
											Window: {shortDateFmt.format(new Date(fertility.fertileWindow.start))} – {shortDateFmt.format(new Date(fertility.fertileWindow.end))}
										</ThemedText>
									) : (
										<ThemedText>No recent cycle start found</ThemedText>
									)}
								</View>
							</View>
						) : (
							<ThemedText style={{ opacity: 0.8 }}>Add blood flow entries to estimate fertility</ThemedText>
						)}
					</Card>

					{errorMsg ? (
						<ThemedText style={{ color: error, textAlign: 'center', marginTop: 12 }}>{errorMsg}</ThemedText>
					) : null}
				</ScrollView>
			</Animated.View>
		</ThemedView>
	);
}

// UI building blocks
function Card({ children }: { children: React.ReactNode }) {
	const card = useThemeColor({}, 'card');
	const border = useThemeColor({}, 'border');
	return (
		<View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
			{children}
		</View>
	);
}

function Label({ children }: { children: React.ReactNode }) {
	return <ThemedText style={styles.label}>{children}</ThemedText>;
}

function Tag({ color, text, icon }: { color: string; text: string; icon: keyof typeof Ionicons.glyphMap }) {
	return (
		<View style={[styles.tag, { backgroundColor: color }]}>
			<Ionicons name={icon} size={14} color={'#fff'} style={{ marginRight: 6 }} />
			<ThemedText style={{ color: '#fff', fontWeight: '600' }}>{text}</ThemedText>
		</View>
	);
}

function Chip({ active, onPress, icon, label, tint, border, textColor }: {
	active: boolean;
	onPress: () => void;
	icon?: React.ReactNode;
	label: string;
	tint: string;
	border: string;
	textColor: string;
}) {
	const scale = useRef(new Animated.Value(1)).current;
	const animate = (to: number) => Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 5, tension: 180 }).start();
	return (
		<Pressable
			onPress={() => {
				animate(0.95);
				onPress();
				setTimeout(() => animate(1), 80);
			}}
			style={({ pressed }) => [
				styles.chip,
				{
					borderColor: active ? 'transparent' : border,
					backgroundColor: active ? tint : 'transparent',
					opacity: pressed ? 0.9 : 1,
				},
			]}
		>
			<Animated.View style={{ transform: [{ scale }] }}>
				<View style={styles.chipInner}>
					{icon}
					<ThemedText style={{ marginLeft: icon ? 6 : 0, color: active ? '#fff' : textColor }}>{label}</ThemedText>
				</View>
			</Animated.View>
		</Pressable>
	);
}

// Logic helpers
function computePillState(cfg: PillConfig, day: Date): PillState {
	const total = cfg.cycleLength + cfg.breakLength;
	if (!cfg.firstPillDate || total <= 0) return { dayOfCycle: null, isPillDay: null, isBreakDay: null, nextBreakStart: null, currentBreakEnds: null };
	const start = new Date(cfg.firstPillDate);
	const diff = Math.floor((stripTime(day).getTime() - stripTime(start).getTime()) / 86400000);
	const dayIndex = mod(diff, total); // 0-based within cycle
	const dayOfCycle = dayIndex + 1;
	const isBreakDay = dayIndex >= cfg.cycleLength;
	const isPillDay = !isBreakDay; // pills on active days

	const nextBreakStartIndex = cfg.cycleLength; // index when break begins
	const cyclesSince = Math.floor(diff / total);
	const currentCycleStart = addDays(start, cyclesSince * total);
	const nextBreakStartDate = addDays(currentCycleStart, nextBreakStartIndex);
	const breakEndDate = addDays(nextBreakStartDate, cfg.breakLength);

	const inCurrentCycle = diff >= cyclesSince * total && diff < (cyclesSince + 1) * total;
	const nextBreakStart = inCurrentCycle && dayIndex < nextBreakStartIndex ? toLocalDateKey(nextBreakStartDate) : (dayIndex >= nextBreakStartIndex ? toLocalDateKey(addDays(currentCycleStart, total)) : toLocalDateKey(nextBreakStartDate));
	const currentBreakEnds = isBreakDay ? toLocalDateKey(breakEndDate) : null;

	return { dayOfCycle, isBreakDay, isPillDay, nextBreakStart, currentBreakEnds };
}

async function computeFertility(storage: Awaited<ReturnType<typeof createSQLiteStorage>>): Promise<FertilityInfo> {
	// Look back 120 days to infer last flow start
	const end = stripTime(new Date());
	const start = addDays(end, -120);
	const entries = await storage.listEntriesInRange(start, end);
	const map = new Map(entries.map(e => [e.date, e] as const));

	let lastStart: string | null = null;
	for (let i = 0; i < entries.length; i++) {
		const e = entries[i];
		if ((e.bloodFlow ?? BloodFlow.None) > BloodFlow.None) {
			const prev = map.get(toLocalDateKey(addDays(new Date(e.date), -1)));
			const prevFlow = prev?.bloodFlow ?? BloodFlow.None;
			if (prevFlow === BloodFlow.None) {
				// candidate start
				if (!lastStart || new Date(e.date) > new Date(lastStart)) {
					lastStart = e.date;
				}
			}
		}
	}

	if (!lastStart) return { cycleStart: null, cycleDay: null, status: 'unknown', fertileWindow: null, ovulationDay: null };

	const d0 = new Date(lastStart);
	const today = stripTime(new Date());
	const cycleDay = Math.max(1, Math.floor((today.getTime() - d0.getTime()) / 86400000) + 1);
	const ovulationOffset = 14 - 1; // day 14 => index 13
	const fertileStartOffset = 12 - 1;
	const fertileEndOffset = 16 - 1;
	const ovulationDay = toLocalDateKey(addDays(d0, ovulationOffset));
	const fertileWindow = { start: toLocalDateKey(addDays(d0, fertileStartOffset)), end: toLocalDateKey(addDays(d0, fertileEndOffset)) };

	let status: FertilityInfo['status'] = 'low';
	const todayKey = toLocalDateKey(today);
	if (todayKey === ovulationDay) status = 'ovulation';
	else if (todayKey >= fertileWindow.start && todayKey <= fertileWindow.end) status = 'fertile';

	return { cycleStart: lastStart, cycleDay, status, fertileWindow, ovulationDay };
}

// date helpers
function stripTime(d: Date) { const dt = new Date(d); dt.setHours(0,0,0,0); return dt; }
function addDays(d: Date, n: number) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function mod(n: number, m: number) { return ((n % m) + m) % m; }

const styles = StyleSheet.create({
	scrollContent: {
		padding: 16,
		gap: 12,
	},
	headerGrad: {
		borderRadius: 16,
		padding: 16,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '700',
	},
	pillBanner: {
		marginTop: 12,
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
	},
	pillBannerText: {
		fontSize: 14,
		fontWeight: '600',
	},
	card: {
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 8,
	},
	rowBetween: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	label: {
		fontSize: 14,
		opacity: 0.8,
	},
	valueText: {
		fontSize: 16,
		fontWeight: '700',
	},
	section: {
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: StyleSheet.hairlineWidth,
	},
	switchPill: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
	},
	flowRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 8,
	},
	chip: {
		borderRadius: 999,
		borderWidth: 1,
	},
	chipInner: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	tagsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tag: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		flexDirection: 'row',
		alignItems: 'center',
	},
});
