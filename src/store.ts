import {
  DEFAULT_GOALS,
  STORAGE_KEY,
  emptyPrayers,
  type AppState,
  type DayLog,
  type Goals,
  type Prayers,
  type SetBlock,
} from "./types";
import { todayISO } from "./format";
import { createStoreNotify } from "./emit";

const bus = createStoreNotify();

function emptySet(): SetBlock {
  return { reps: 0, sets: 0 };
}

export function blankDay(date: string): DayLog {
  return {
    date,
    pushups: emptySet(),
    pullups: emptySet(),
    dips: emptySet(),
    squats: emptySet(),
    anki: 0,
    prayers: emptyPrayers(),
    runs: [],
  };
}

function asSet(v: unknown): SetBlock {
  if (!v || typeof v !== "object") return emptySet();
  const s = v as Partial<SetBlock>;
  return {
    reps: Number.isFinite(s.reps) ? Math.max(0, Number(s.reps)) : 0,
    sets: Number.isFinite(s.sets) ? Math.max(0, Number(s.sets)) : 0,
  };
}

function asPrayers(v: unknown): Prayers {
  const p = v && typeof v === "object" ? (v as Partial<Prayers>) : {};
  return {
    fajr: !!p.fajr,
    dhuhr: !!p.dhuhr,
    asr: !!p.asr,
    maghrib: !!p.maghrib,
    isha: !!p.isha,
  };
}

function normalizeDay(raw: DayLog): DayLog {
  return {
    date: raw.date,
    pushups: asSet(raw.pushups),
    pullups: asSet(raw.pullups),
    dips: asSet(raw.dips),
    squats: asSet(raw.squats),
    anki: Number.isFinite(raw.anki) ? Math.max(0, raw.anki) : 0,
    prayers: asPrayers(raw.prayers),
    runs: Array.isArray(raw.runs) ? raw.runs : [],
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

function normalizeState(parsed: AppState): AppState {
  const logs: Record<string, DayLog> = {};
  for (const [date, day] of Object.entries(parsed.logs)) {
    logs[date] = normalizeDay({ ...day, date: day.date || date });
  }
  return {
    version: 1,
    logs,
    goals: { ...DEFAULT_GOALS, ...parsed.goals },
  };
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
    return normalizeState(parsed);
  } catch {
    return defaultState();
  }
}

let state: AppState = load();

function persist(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  bus.notify();
}

export function getState(): AppState {
  return state;
}

export function subscribe(fn: () => void): () => void {
  return bus.subscribe(fn);
}

export function getDay(date = todayISO()): DayLog {
  return state.logs[date] ? structuredClone(state.logs[date]) : blankDay(date);
}

function writeDay(day: DayLog): void {
  const sets = [day.pushups, day.pullups, day.dips, day.squats];
  const prayers = Object.values(day.prayers).some(Boolean);
  const isEmpty =
    sets.every((s) => s.reps === 0 && s.sets === 0) &&
    day.anki === 0 &&
    day.runs.length === 0 &&
    !prayers;
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
  state = normalizeState(next);
  persist();
}

export function exportJson(): string {
  return JSON.stringify(state, null, 2);
}

export function resetAll(): void {
  state = defaultState();
  persist();
}
