import { DEFAULT_GOALS, STORAGE_KEY, type AppState, type DayLog, type Goals } from "./types";
import { todayISO } from "./format";

const listeners = new Set<() => void>();

function emptyDay(date: string): DayLog {
  return {
    date,
    pushups: { reps: 0, sets: 0 },
    pullups: { reps: 0, sets: 0 },
    dips: { reps: 0, sets: 0 },
    anki: 0,
    runs: [],
  };
}

function defaultState(): AppState {
  return { version: 1, logs: {}, goals: { ...DEFAULT_GOALS } };
}

function isDayLog(v: unknown): v is DayLog {
  if (!v || typeof v !== "object") return false;
  const d = v as DayLog;
  return (
    typeof d.date === "string" &&
    typeof d.anki === "number" &&
    Array.isArray(d.runs) &&
    !!d.pushups &&
    !!d.pullups &&
    !!d.dips
  );
}

export function isValidState(v: unknown): v is AppState {
  if (!v || typeof v !== "object") return false;
  const s = v as AppState;
  if (s.version !== 1 || !s.logs || typeof s.logs !== "object" || !s.goals) return false;
  return Object.values(s.logs).every(isDayLog);
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidState(parsed)) return defaultState();
    return {
      version: 1,
      logs: parsed.logs,
      goals: { ...DEFAULT_GOALS, ...parsed.goals },
    };
  } catch {
    return defaultState();
  }
}

let state: AppState = load();

function persist(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  for (const fn of listeners) fn();
}

export function getState(): AppState {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getDay(date = todayISO()): DayLog {
  return state.logs[date] ? structuredClone(state.logs[date]) : emptyDay(date);
}

function writeDay(day: DayLog): void {
  const isEmpty =
    day.pushups.reps === 0 &&
    day.pushups.sets === 0 &&
    day.pullups.reps === 0 &&
    day.pullups.sets === 0 &&
    day.dips.reps === 0 &&
    day.dips.sets === 0 &&
    day.anki === 0 &&
    day.runs.length === 0;
  if (isEmpty) delete state.logs[day.date];
  else state.logs[day.date] = day;
  persist();
}

export function patchDay(date: string, patch: (day: DayLog) => void): DayLog {
  const day = getDay(date);
  patch(day);
  writeDay(day);
  return day;
}

export function setGoals(goals: Goals): void {
  state.goals = { ...goals };
  persist();
}

export function replaceState(next: AppState): void {
  state = {
    version: 1,
    logs: next.logs,
    goals: { ...DEFAULT_GOALS, ...next.goals },
  };
  persist();
}

export function exportJson(): string {
  return JSON.stringify(state, null, 2);
}

export function resetAll(): void {
  state = defaultState();
  persist();
}
