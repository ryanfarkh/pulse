export const CAMP_WEEKS = 12;
export const DELOAD_WEEKS = [4, 8, 12] as const;
export const PULLUP_BASELINE = 7;
export const PULLUP_TARGET = 20;
export const FIVEK_BASELINE_SEC = 25 * 60;
export const FIVEK_TARGET_SEC = 22 * 60;
export const BW_BASELINE = 85;
export const CAMP_STORAGE_KEY = "pulse.camp.v1";

export const KB_WEIGHTS = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15] as const;

export type ExerciseKind = "strength" | "kettlebell" | "run" | "mobility";

export type ExerciseTemplate = {
  id: string;
  name: string;
  target: string;
  kind: ExerciseKind;
  sets: number;
  bodyweight?: boolean;
};

export type SetEntry = {
  id: string;
  weightKg: number | null;
  reps: number;
  done: boolean;
};

export type ExerciseLog = {
  sets: SetEntry[];
  distanceKm: number;
  durationSec: number;
  rpe: number | null;
  mobilityDone: boolean;
  mobilityMin: number;
};

export type PullupMark = { id: string; date: string; reps: number };
export type FiveKMark = { id: string; date: string; durationSec: number };
export type WeightMark = { id: string; date: string; kg: number };

export type CampState = {
  version: 1;
  week: number;
  logs: Record<string, ExerciseLog>;
  custom: Record<string, ExerciseTemplate[]>;
  pullups: PullupMark[];
  fivek: FiveKMark[];
  bodyweight: WeightMark[];
};

export function blankLog(): ExerciseLog {
  return {
    sets: [],
    distanceKm: 0,
    durationSec: 0,
    rpe: null,
    mobilityDone: false,
    mobilityMin: 0,
  };
}

export function isDeload(week: number): boolean {
  return (DELOAD_WEEKS as readonly number[]).includes(week);
}
