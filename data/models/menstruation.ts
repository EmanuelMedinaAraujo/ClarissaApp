// Fixed symptom set
export const Symptom = {
  cramps: 1 << 0,
  vomiting: 1 << 1,
  headache: 1 << 2,
  moodChanges: 1 << 3,
} as const;

export type SymptomKey = keyof typeof Symptom;

/**
 * Create a bitmask from an array of symptom keys
 */
export function createSymptomBitmask(symptoms: SymptomKey[]): number {
  // Deduplicate keys
  const unique = Array.from(new Set(symptoms));
  return unique.reduce((mask, key) => mask | Symptom[key], 0);
}

/**
 * Decode a bitmask into an array of symptom keys
 */
export function decodeSymptomBitmask(mask: number): SymptomKey[] {
  return (Object.keys(Symptom) as SymptomKey[]).filter(key => (mask & Symptom[key]) !== 0);
}
// Domain model and enums for the menstruation/pill tracking data layer

export enum BloodFlow {
  None = 0,
  Light = 1,
  Medium = 2,
  Heavy = 3,
}

export type Entry = {
  /**
   * Local date key in YYYY-MM-DD format. Unique per day.
   */
  date: string;
  pillTaken: boolean;
  bloodFlow: BloodFlow;
  /**
   * Array of symptom keys (decoded from bitmask internally).
   */
  symptoms?: SymptomKey[];
  /**
   * Free-form note, optional. Only a single string is stored per entry.
   */
  notes?: string;
};

/** Utility to normalize a Date or date-like string to local YYYY-MM-DD */
export function toLocalDateKey(input: Date | string): string {
  if (typeof input === 'string') {
    // Assume already a date key if matches pattern
    const m = input.match(/^\d{4}-\d{2}-\d{2}$/);
    if (m) return input;
    const d = new Date(input);
    return toLocalDateKey(d);
  }
  const d = input;
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
