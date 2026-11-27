import { formatDuration, formatPace, trimNum } from "../format";
import {
  BW_BASELINE,
  FIVEK_BASELINE_SEC,
  FIVEK_TARGET_SEC,
  PULLUP_BASELINE,
  PULLUP_TARGET,
  type ExerciseLog,
  type FiveKMark,
  type PullupMark,
  type SetEntry,
  type WeightMark,
} from "./types";

export type StrengthStats = {
  totalReps: number;
  maxWeight: number;
  volume: number;
};

function usedSets(sets: SetEntry[]): SetEntry[] {
  return sets.filter((s) => s.reps > 0);
}

export function strengthStats(sets: SetEntry[]): StrengthStats | null {
  const used = usedSets(sets);
  if (!used.length) return null;
  let totalReps = 0;
  let maxWeight = 0;
  let volume = 0;
  for (const s of used) {
    const w = s.weightKg ?? 0;
    totalReps += s.reps;
    if (w > maxWeight) maxWeight = w;
    volume += s.reps * (w > 0 ? w : 1);
  }
  return { totalReps, maxWeight, volume };
}

function greater(a: number, b: number): boolean {
  return a > b + 1e-6;
}

export function strengthOverloaded(current: ExerciseLog, previous: ExerciseLog | null): boolean {
  if (!previous) return false;
  const now = strengthStats(current.sets);
  const prev = strengthStats(previous.sets);
  if (!now || !prev) return false;
  return (
    greater(now.volume, prev.volume) ||
    greater(now.maxWeight, prev.maxWeight) ||
    greater(now.totalReps, prev.totalReps)
  );
}

export function runOverloaded(current: ExerciseLog, previous: ExerciseLog | null): boolean {
  if (!previous) return false;
  if (current.distanceKm <= 0 || current.durationSec <= 0) return false;
  if (previous.distanceKm <= 0 || previous.durationSec <= 0) return false;
  const paceNow = current.durationSec / current.distanceKm;
  const pacePrev = previous.durationSec / previous.distanceKm;
  return greater(previous.distanceKm, 0) && (paceNow + 1 < pacePrev || greater(current.distanceKm, previous.distanceKm));
}

export function formatSetSummary(sets: SetEntry[], bodyweight = false): string {
  const used = usedSets(sets);
  if (!used.length) return "—";
  const n = used.length;
  const reps0 = used[0].reps;
  const w0 = used[0].weightKg;
  const sameReps = used.every((s) => s.reps === reps0);
  const sameW = used.every((s) => s.weightKg === w0);
  const bw = w0 == null ? bodyweight : w0 === 0;
  if (sameReps && sameW) {
    if (w0 == null && !bodyweight) return `${n}×${reps0}`;
    if (bw) return `${n}×${reps0} BW`;
    return `${n}×${reps0} @ ${trimNum(w0 ?? 0)}kg`;
  }
  const total = used.reduce((sum, s) => sum + s.reps, 0);
  if (sameW) {
    if (w0 == null && !bodyweight) return `${n} sets · ${total} reps`;
    if (bw) return `${n} sets · ${total} reps BW`;
    return `${n} sets · ${total} reps @ ${trimNum(w0 ?? 0)}kg`;
  }
  const maxW = Math.max(...used.map((s) => s.weightKg ?? 0));
  return maxW > 0 ? `${n} sets · ${total} reps · max ${trimNum(maxW)}kg` : `${n} sets · ${total} reps`;
}

export function formatRunSummary(log: ExerciseLog): string {
  if (log.distanceKm <= 0 && log.durationSec <= 0 && log.rpe == null) return "—";
  const parts: string[] = [];
  if (log.distanceKm > 0) parts.push(`${trimNum(log.distanceKm)} km`);
  if (log.durationSec > 0) parts.push(formatDuration(log.durationSec));
  if (log.distanceKm > 0 && log.durationSec > 0) parts.push(formatPace(log.distanceKm, log.durationSec));
  if (log.rpe) parts.push(`RPE ${log.rpe}`);
  return parts.join(" · ") || "—";
}

export function formatMobilitySummary(log: ExerciseLog): string {
  if (!log.mobilityDone && log.mobilityMin <= 0) return "—";
  if (log.mobilityDone && log.mobilityMin > 0) return `Done · ${trimNum(log.mobilityMin)} min`;
  if (log.mobilityDone) return "Done";
  return `${trimNum(log.mobilityMin)} min`;
}

export function lastLabel(log: ExerciseLog | null, bodyweight: boolean, kind: ExerciseLogKind): string {
  if (!log) return "—";
  if (kind === "run") return formatRunSummary(log);
  if (kind === "mobility") return formatMobilitySummary(log);
  return formatSetSummary(log.sets, bodyweight);
}

export type ExerciseLogKind = "strength" | "kettlebell" | "run" | "mobility";

export function sessionOverloaded(kind: ExerciseLogKind, current: ExerciseLog, previous: ExerciseLog | null): boolean {
  if (kind === "run") return runOverloaded(current, previous);
  if (kind === "mobility") return false;
  return strengthOverloaded(current, previous);
}

function latestMark<T extends { date: string; id: string }>(marks: T[]): T | null {
  if (!marks.length) return null;
  return [...marks].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).at(-1) ?? null;
}

export function pullupSnapshot(marks: PullupMark[]): { best: number; pct: number; logged: boolean; hit: boolean } {
  const logged = marks.length > 0;
  const best = logged ? Math.max(...marks.map((m) => m.reps)) : PULLUP_BASELINE;
  const span = PULLUP_TARGET - PULLUP_BASELINE;
  const pct = span <= 0 ? 0 : Math.max(0, Math.min(1, (best - PULLUP_BASELINE) / span));
  return { best, pct, logged, hit: best >= PULLUP_TARGET };
}

export function fivekSnapshot(marks: FiveKMark[]): {
  best: number;
  pct: number;
  logged: boolean;
  hit: boolean;
} {
  const logged = marks.length > 0;
  const best = logged ? Math.min(...marks.map((m) => m.durationSec)) : FIVEK_BASELINE_SEC;
  const span = FIVEK_BASELINE_SEC - FIVEK_TARGET_SEC;
  const pct = span <= 0 ? 0 : Math.max(0, Math.min(1, (FIVEK_BASELINE_SEC - best) / span));
  return { best, pct, logged, hit: best <= FIVEK_TARGET_SEC && logged };
}

export function weightSnapshot(marks: WeightMark[]): { kg: number; delta: number; logged: boolean } {
  const latest = latestMark(marks);
  const kg = latest ? latest.kg : BW_BASELINE;
  return { kg, delta: Math.round((kg - BW_BASELINE) * 10) / 10, logged: !!latest };
}
