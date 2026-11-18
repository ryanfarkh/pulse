export type ExerciseKey = "pushups" | "pullups" | "dips" | "squats";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type SetBlock = {
  reps: number;
  sets: number;
};

export type Prayers = Record<PrayerKey, boolean>;

export type Run = {
  id: string;
  distanceKm: number;
  durationSec: number;
  notes: string;
};

export type DayLog = {
  date: string;
  pushups: SetBlock;
  pullups: SetBlock;
  dips: SetBlock;
  squats: SetBlock;
  anki: number;
  prayers: Prayers;
  runs: Run[];
};

export type Goals = {
  pushups: number;
  pullups: number;
  dips: number;
  squats: number;
  anki: number;
  weeklyRuns: number;
};

export type AppState = {
  version: 1;
  logs: Record<string, DayLog>;
  goals: Goals;
};

export type Tab = "today" | "stats" | "records" | "settings";

export type Range = "week" | "month";

export const EXERCISES: { key: ExerciseKey; label: string; short: string }[] = [
  { key: "pushups", label: "Push-ups", short: "Push" },
  { key: "pullups", label: "Pull-ups", short: "Pull" },
  { key: "dips", label: "Dips", short: "Dips" },
  { key: "squats", label: "Squats", short: "Squat" },
];

export const PRAYERS: { key: PrayerKey; label: string; short: string }[] = [
  { key: "fajr", label: "Fajr", short: "Fajr" },
  { key: "dhuhr", label: "Dhuhr", short: "Dhuhr" },
  { key: "asr", label: "Asr", short: "Asr" },
  { key: "maghrib", label: "Maghrib", short: "Magh" },
  { key: "isha", label: "Isha", short: "Isha" },
];

export const DEFAULT_GOALS: Goals = {
  pushups: 100,
  pullups: 20,
  dips: 40,
  squats: 50,
  anki: 100,
  weeklyRuns: 2,
};

export function emptyPrayers(): Prayers {
  return { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false };
}

export function prayerCount(prayers: Prayers | undefined): number {
  if (!prayers) return 0;
  return PRAYERS.reduce((n, p) => n + (prayers[p.key] ? 1 : 0), 0);
}

export const STORAGE_KEY = "pulse.v1";
