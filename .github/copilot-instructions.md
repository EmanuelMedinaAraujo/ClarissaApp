# AI Assistant Rules (ClarissaApp)

Goal: Make focused, minimal diffs that move the Expo + expo-router app toward the MVP in `README.md`, reusing existing patterns and deps.

## Architecture
- File-based routing (expo-router). Root stack in `app/_layout.tsx` provides `ThemeContext`; `app/index.tsx` redirects to `/(tabs)/today`; tabs in `app/(tabs)/_layout.tsx` with a translucent bar (BlurView on iOS).
- Theming via `ThemeContext` (`light|dark|red|system`) + `constants/Colors.ts`; use `components/ThemedText` / `components/ThemedView` / `hooks/useThemeColor`.
- Main tabs: `today.tsx`, `calendar.tsx`, `profile.tsx`.

## Data & storage
- expo-sqlite DB `clarissa.db`.
   - `entries` (exactly 5 cols): `date TEXT UNIQUE`, `pill_taken INTEGER`, `blood_flow INTEGER`, `symptoms INTEGER`, `notes TEXT`.
   - `pill_config` (singleton row `id=1`): `cycle_length`, `break_length`, `first_pill_date`.
- Types/helpers: `data/models/menstruation.ts` defines `BloodFlow`, fixed `SymptomKey` set (`cramps|vomiting|headache|moodChanges`), bitmask helpers, and `toLocalDateKey` (normalize to local `YYYY-MM-DD`).
- Storage service: `data/storage/sqliteStorage.ts` → `createSQLiteStorage()` provides `loadAllEntries`, `getEntryByData` (alias `getEntryByDate`), `listEntriesInRange`, `recordPillIntake`, `recordBloodFlow`, `recordSymptom`, `recordNote`, `addOrUpdateEntry`, `getPillConfig`, `savePillConfig` (sanitizes/normalizes).
- Domain `Entry`: `{ date: string; pillTaken: boolean; bloodFlow: BloodFlow; symptoms?: SymptomKey[]; notes?: string }`.

## Cross-screen communication
- `logic/eventBus.ts` with `events` and `AppEvents.PillConfigChanged`. Emit after saving pill config (Profile) and subscribe in Today/Calendar to refresh.

## Screens: key patterns
- Today: init storage once, refresh on focus; flow toggles are idempotent (tap again to clear); use `addOrUpdateEntry` for atomic saves; only today’s pill can be marked taken; infer period starts (flow>None after None) and compute simple insights (next period, fertility window via day-14 from last start).
- Calendar: `react-native-calendars` with custom `DayComponent`; background color by flow (theme-aware); ring for selected day; pill dot (filled=taken, outline=not taken); if no entry and date ≥ today, show pill expectation (striped outline) from pill config; entries fetched per visible month; notes save is debounced; immediate persistence for toggles.
- Profile: theme selector; pill cycle with `DateTimePicker`; sanitize on save; “Use today” sets `firstPillDate`; emits `PillConfigChanged`.

## Conventions
- Normalize all dates with `toLocalDateKey`; use local `YYYY-MM-DD` keys everywhere.
- Respect the exact `entries` schema and fixed `SymptomKey` set.
- Compute pill expectations via `(cycleLength + breakLength)` modulo from `first_pill_date`; only show for today/future when no entry exists.
- Keep screens lean; shared UI in `components/`, hooks in `hooks/`, storage/types in `data/`.
- Use `ThemeContext` + `Colors` for styling; preserve tab bar translucency.

## Out of scope (now)
- `expo-notifications` scheduling not wired yet; plan to use stored config. Future items (encryption/partner sharing, etc.) are intentionally out of scope.