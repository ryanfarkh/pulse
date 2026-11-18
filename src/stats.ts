import { addDays, isFiveK, paceSecPerKm, startOfWeek, todayISO } from "./format";
import { EXERCISES, PRAYERS, prayerCount, type AppState, type DayLog, type ExerciseKey } from "./types";

export function isActive(day: DayLog | undefined): boolean {
  if (!day) return false;
  return (
    EXERCISES.some((ex) => day[ex.key].reps > 0) ||
    day.anki > 0 ||
    day.runs.length > 0 ||
    prayerCount(day.prayers) > 0
  );
}

export function activityScore(day: DayLog | undefined, goals: AppState["goals"]): number {
  if (!day) return 0;
  let n = 0;
  for (const ex of EXERCISES) if (day[ex.key].reps > 0) n += 1;
  if (day.anki > 0) n += 1;
  if (day.runs.length > 0) n += 1;
  if (prayerCount(day.prayers) > 0) n += 1;
  const completions =
    EXERCISES.reduce((sum, ex) => sum + (day[ex.key].reps >= goals[ex.key] ? 1 : 0), 0) +
    (day.anki >= goals.anki ? 1 : 0) +
    (prayerCount(day.prayers) === PRAYERS.length ? 1 : 0);
  return Math.min(4, Math.max(n > 0 ? 1 : 0, completions, n >= 3 ? 3 : n));
}

export function currentStreak(state: AppState, from = todayISO()): number {
  let streak = 0;
  let cursor = from;
  if (!isActive(state.logs[cursor])) cursor = addDays(cursor, -1);
  while (isActive(state.logs[cursor])) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(state: AppState): { days: number; end: string | null } {
  const dates = Object.keys(state.logs).filter((d) => isActive(state.logs[d])).sort();
  let best = 0;
  let bestEnd: string | null = null;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    if (prev && addDays(prev, 1) === d) run += 1;
    else run = 1;
    if (run > best) {
      best = run;
      bestEnd = d;
    }
    prev = d;
  }
  return { days: best, end: bestEnd };
}

export function heatmap(state: AppState, days = 371): { date: string; score: number }[] {
  const end = todayISO();
  const start = addDays(end, -(days - 1));
  const cells: { date: string; score: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    cells.push({ date, score: activityScore(state.logs[date], state.goals) });
  }
  return cells;
}

export function ringProgress(value: number, goal: number): number {
  if (goal <= 0) return value > 0 ? 1 : 0;
  return Math.min(1, value / goal);
}

export type PR = {
  label: string;
  value: string;
  sub: string;
  date: string | null;
  kind: string;
};

export function computePRs(state: AppState): PR[] {
  const best: Record<ExerciseKey, { reps: number; date: string | null }> = {
    pushups: { reps: 0, date: null },
    pullups: { reps: 0, date: null },
    dips: { reps: 0, date: null },
    squats: { reps: 0, date: null },
  };
  let maxAnki = 0;
  let maxAnkiDate: string | null = null;
  let best5k = Infinity;
  let best5kDate: string | null = null;
  let bestPace = Infinity;
  let bestPaceDate: string | null = null;
  let bestPaceKm = 0;

  for (const day of Object.values(state.logs)) {
    for (const ex of EXERCISES) {
      if (day[ex.key].reps > best[ex.key].reps) {
        best[ex.key] = { reps: day[ex.key].reps, date: day.date };
      }
    }
    if (day.anki > maxAnki) {
      maxAnki = day.anki;
      maxAnkiDate = day.date;
    }
    for (const run of day.runs) {
      if (isFiveK(run.distanceKm) && run.durationSec > 0 && run.durationSec < best5k) {
        best5k = run.durationSec;
        best5kDate = day.date;
      }
      const pace = paceSecPerKm(run.distanceKm, run.durationSec);
      if (pace != null && pace < bestPace) {
        bestPace = pace;
        bestPaceDate = day.date;
        bestPaceKm = run.distanceKm;
      }
    }
  }

  const streak = longestStreak(state);

  return [
    ...EXERCISES.map((ex) => ({
      kind: ex.key,
      label: ex.label,
      value: best[ex.key].reps ? `${best[ex.key].reps}` : "—",
      sub: "best day",
      date: best[ex.key].date,
    })),
    {
      kind: "fivek",
      label: "Fastest 5K",
      value: Number.isFinite(best5k) && best5k < Infinity ? formatDurationSafe(best5k) : "—",
      sub: "all-time",
      date: best5kDate,
    },
    {
      kind: "pace",
      label: "Best pace",
      value: Number.isFinite(bestPace) && bestPace < Infinity ? `${formatDurationSafe(bestPace)} /km` : "—",
      sub: bestPaceKm ? `${bestPaceKm} km` : "any distance",
      date: bestPaceDate,
    },
    {
      kind: "anki",
      label: "Anki cards",
      value: maxAnki ? `${maxAnki}` : "—",
      sub: "most in a day",
      date: maxAnkiDate,
    },
    {
      kind: "streak",
      label: "Longest streak",
      value: streak.days ? `${streak.days}d` : "—",
      sub: "don't break the chain",
      date: streak.end,
    },
  ];
}

function formatDurationSafe(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function volumeSeries(
  state: AppState,
  key: ExerciseKey | "anki",
  range: "week" | "month",
  end = todayISO(),
): { label: string; date: string; value: number }[] {
  const n = range === "week" ? 7 : 30;
  const start = addDays(end, -(n - 1));
  const out: { label: string; date: string; value: number }[] = [];
  for (let i = 0; i < n; i++) {
    const date = addDays(start, i);
    const day = state.logs[date];
    const value = key === "anki" ? day?.anki ?? 0 : day?.[key]?.reps ?? 0;
    const label = range === "week"
      ? ["S", "M", "T", "W", "T", "F", "S"][new Date(date + "T12:00:00").getDay()]
      : String(new Date(date + "T12:00:00").getDate());
    out.push({ label, date, value });
  }
  return out;
}

export function runSeries(state: AppState): {
  date: string;
  distanceKm: number;
  durationSec: number;
  pace: number;
  fivek: boolean;
}[] {
  const rows: {
    date: string;
    distanceKm: number;
    durationSec: number;
    pace: number;
    fivek: boolean;
  }[] = [];
  for (const day of Object.values(state.logs)) {
    for (const run of day.runs) {
      const pace = paceSecPerKm(run.distanceKm, run.durationSec);
      if (pace == null) continue;
      rows.push({
        date: day.date,
        distanceKm: run.distanceKm,
        durationSec: run.durationSec,
        pace,
        fivek: isFiveK(run.distanceKm),
      });
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

export function runsThisWeek(state: AppState, date = todayISO()): number {
  const start = startOfWeek(date);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    n += state.logs[d]?.runs.length ?? 0;
  }
  return n;
}

export function detectNewPRs(before: PR[], after: PR[]): PR[] {
  return after.filter((a) => {
    const b = before.find((x) => x.kind === a.kind);
    if (!b) return a.value !== "—";
    return a.value !== "—" && a.value !== b.value;
  });
}
