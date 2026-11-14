export type ExerciseKey = "pushups" | "pullups" | "dips";

export type SetBlock = {
  reps: number;
  sets: number;
};

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
  anki: number;
  runs: Run[];
};

export type Goals = {
  pushups: number;
  pullups: number;
  dips: number;
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
];

export const DEFAULT_GOALS: Goals = {
  pushups: 100,
  pullups: 20,
  dips: 40,
  anki: 100,
  weeklyRuns: 2,
};

export const STORAGE_KEY = "pulse.v1";
