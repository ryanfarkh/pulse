import { clamp, todayISO, uid } from "../format";
import { createStoreNotify } from "../emit";
import { DEFAULT_LAYOUT, LEGACY_WEEKDAY_TEMPLATE, isTemplateId } from "./program";
import { CAMP_START_DEFAULT, activeCampWeek, parseLayout, snapToMonday } from "./schedule";
import {
  CAMP_STORAGE_KEY,
  CAMP_WEEKS,
  blankLog,
  type CampState,
  type ExerciseKind,
  type ExerciseLog,
  type ExerciseTemplate,
  type FiveKMark,
  type PullupMark,
  type SetEntry,
  type TemplateId,
  type WeightMark,
} from "./types";

const bus = createStoreNotify();

const KINDS: ExerciseKind[] = ["strength", "kettlebell", "run", "mobility"];

function emptySet(): SetEntry {
  return { id: uid(), weightKg: null, reps: 0, done: false };
}

function defaultState(): CampState {
  return {
    version: 1,
    week: activeCampWeek(CAMP_START_DEFAULT),
    startDate: CAMP_START_DEFAULT,
    defaultLayout: [...DEFAULT_LAYOUT],
    weekPlans: {},
    logs: {},
    custom: {},
    pullups: [],
    fivek: [],
    bodyweight: [],
  };
}

function asKind(v: unknown): ExerciseKind {
  return KINDS.includes(v as ExerciseKind) ? (v as ExerciseKind) : "strength";
}

function asSet(v: unknown): SetEntry | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Partial<SetEntry>;
  let weight: number | null = null;
  if (typeof s.weightKg === "number" && Number.isFinite(s.weightKg)) weight = clamp(s.weightKg, 0, 1000);
  return {
    id: typeof s.id === "string" && s.id ? s.id : uid(),
    weightKg: weight,
    reps: Number.isFinite(s.reps) ? clamp(Math.round(Number(s.reps)), 0, 999) : 0,
    done: !!s.done,
  };
}

function asLog(v: unknown): ExerciseLog {
  const raw = v && typeof v === "object" ? (v as Partial<ExerciseLog>) : {};
  const sets = Array.isArray(raw.sets) ? raw.sets.map(asSet).filter((s): s is SetEntry => !!s) : [];
  const rpe = typeof raw.rpe === "number" && raw.rpe >= 1 && raw.rpe <= 10 ? Math.round(raw.rpe) : null;
  return {
    sets,
    distanceKm: Number.isFinite(raw.distanceKm) ? clamp(Number(raw.distanceKm), 0, 200) : 0,
    durationSec: Number.isFinite(raw.durationSec) ? clamp(Math.round(Number(raw.durationSec)), 0, 24 * 3600) : 0,
    rpe,
    mobilityDone: !!raw.mobilityDone,
    mobilityMin: Number.isFinite(raw.mobilityMin) ? clamp(Number(raw.mobilityMin), 0, 180) : 0,
  };
}

function asTemplate(v: unknown): ExerciseTemplate | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Partial<ExerciseTemplate>;
  if (typeof t.id !== "string" || !t.id || typeof t.name !== "string" || !t.name.trim()) return null;
  return {
    id: t.id,
    name: t.name.trim().slice(0, 80),
    target: typeof t.target === "string" ? t.target.slice(0, 120) : "",
    kind: asKind(t.kind),
    sets: Number.isFinite(t.sets) ? clamp(Math.round(Number(t.sets)), 0, 20) : 3,
    bodyweight: !!t.bodyweight,
  };
}

function asDate(v: unknown): string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : todayISO();
}

function slotTemplate(slot: string): TemplateId | null {
  if (isTemplateId(slot)) return slot;
  if (/^[0-6]$/.test(slot)) return LEGACY_WEEKDAY_TEMPLATE[Number(slot)];
  return null;
}

function normalize(raw: Partial<CampState> | null): CampState {
  const base = defaultState();
  if (!raw || raw.version !== 1) return base;
  const logs: Record<string, ExerciseLog> = {};
  if (raw.logs && typeof raw.logs === "object") {
    for (const [key, value] of Object.entries(raw.logs)) {
      const parts = key.split(":");
      if (parts.length < 3 || !/^\d+$/.test(parts[0])) continue;
      const template = slotTemplate(parts[1]);
      if (!template) continue;
      logs[`${parts[0]}:${template}:${parts.slice(2).join(":")}`] = asLog(value);
    }
  }
  const custom: Record<string, ExerciseTemplate[]> = {};
  if (raw.custom && typeof raw.custom === "object") {
    for (const [slot, list] of Object.entries(raw.custom)) {
      const template = slotTemplate(slot);
      if (!template || !Array.isArray(list)) continue;
      const items = list.map(asTemplate).filter((t): t is ExerciseTemplate => !!t);
      custom[template] = [...(custom[template] ?? []), ...items];
    }
  }
  const weekPlans: Record<string, TemplateId[]> = {};
  if (raw.weekPlans && typeof raw.weekPlans === "object") {
    for (const [week, layout] of Object.entries(raw.weekPlans)) {
      const n = Number(week);
      const parsed = parseLayout(layout);
      if (n >= 1 && n <= CAMP_WEEKS && parsed) weekPlans[String(n)] = parsed;
    }
  }
  const startDate = snapToMonday(typeof raw.startDate === "string" ? raw.startDate : CAMP_START_DEFAULT);
  const pullups: PullupMark[] = Array.isArray(raw.pullups)
    ? raw.pullups
        .map((m) => {
          const row = m as Partial<PullupMark>;
          const reps = Number(row.reps);
          if (!Number.isFinite(reps) || reps <= 0) return null;
          return { id: typeof row.id === "string" ? row.id : uid(), date: asDate(row.date), reps: clamp(Math.round(reps), 1, 100) };
        })
        .filter((m): m is PullupMark => !!m)
    : [];
  const fivek: FiveKMark[] = Array.isArray(raw.fivek)
    ? raw.fivek
        .map((m) => {
          const row = m as Partial<FiveKMark>;
          const durationSec = Number(row.durationSec);
          if (!Number.isFinite(durationSec) || durationSec <= 0) return null;
          return {
            id: typeof row.id === "string" ? row.id : uid(),
            date: asDate(row.date),
            durationSec: clamp(Math.round(durationSec), 60, 3 * 3600),
          };
        })
        .filter((m): m is FiveKMark => !!m)
    : [];
  const bodyweight: WeightMark[] = Array.isArray(raw.bodyweight)
    ? raw.bodyweight
        .map((m) => {
          const row = m as Partial<WeightMark>;
          const kg = Number(row.kg);
          if (!Number.isFinite(kg) || kg <= 0) return null;
          return { id: typeof row.id === "string" ? row.id : uid(), date: asDate(row.date), kg: clamp(Math.round(kg * 10) / 10, 30, 250) };
        })
        .filter((m): m is WeightMark => !!m)
    : [];
  return {
    version: 1,
    week: clamp(Math.round(Number(raw.week) || activeCampWeek(startDate)), 1, CAMP_WEEKS),
    startDate,
    defaultLayout: parseLayout(raw.defaultLayout) ?? [...DEFAULT_LAYOUT],
    weekPlans,
    logs,
    custom,
    pullups,
    fivek,
    bodyweight,
  };
}

function load(): CampState {
  try {
    const raw = localStorage.getItem(CAMP_STORAGE_KEY);
    if (!raw) return defaultState();
    return normalize(JSON.parse(raw) as Partial<CampState>);
  } catch {
    return defaultState();
  }
}

let state: CampState = load();

function persist(): void {
  localStorage.setItem(CAMP_STORAGE_KEY, JSON.stringify(state));
  bus.notify();
}

export function logKey(week: number, template: TemplateId, exId: string): string {
  return `${week}:${template}:${exId}`;
}

export function weekLayout(week = state.week): TemplateId[] {
  return state.weekPlans[String(week)] ?? state.defaultLayout;
}

export function templateForDay(week: number, day: number): TemplateId {
  return weekLayout(week)[clamp(day, 0, 6)] ?? "C";
}

export function getCampState(): CampState {
  return state;
}

export function subscribeCamp(fn: () => void): () => void {
  return bus.subscribe(fn);
}

export function setCampWeek(week: number): void {
  const next = clamp(Math.round(week), 1, CAMP_WEEKS);
  if (next === state.week) return;
  state.week = next;
  persist();
}

export function getExerciseLog(week: number, template: TemplateId, exId: string): ExerciseLog {
  return state.logs[logKey(week, template, exId)] ?? blankLog();
}

function hasPayload(log: ExerciseLog): boolean {
  return (
    log.sets.length > 0 ||
    log.distanceKm > 0 ||
    log.durationSec > 0 ||
    log.rpe != null ||
    log.mobilityDone ||
    log.mobilityMin > 0
  );
}

export function patchExercise(
  week: number,
  template: TemplateId,
  exId: string,
  patch: (log: ExerciseLog) => void,
): ExerciseLog {
  const key = logKey(week, template, exId);
  const log = state.logs[key] ? structuredClone(state.logs[key]) : blankLog();
  patch(log);
  if (!hasPayload(log)) delete state.logs[key];
  else state.logs[key] = log;
  persist();
  return log;
}

export function ensureSet(log: ExerciseLog, index: number, suggested: number): SetEntry {
  const count = Math.max(log.sets.length, suggested, index + 1);
  while (log.sets.length < count) log.sets.push(emptySet());
  return log.sets[index];
}

export function copyPreviousWeek(week: number, template: TemplateId, exId: string): boolean {
  if (week <= 1) return false;
  const prev = state.logs[logKey(week - 1, template, exId)];
  if (!prev) return false;
  const sets = prev.sets
    .filter((s) => s.reps > 0 || s.weightKg != null)
    .map((s) => ({ ...s, id: uid(), done: false }));
  const next: ExerciseLog = {
    sets,
    distanceKm: prev.distanceKm,
    durationSec: prev.durationSec,
    rpe: prev.rpe,
    mobilityDone: false,
    mobilityMin: prev.mobilityMin,
  };
  if (!sets.length && next.distanceKm <= 0 && next.durationSec <= 0 && next.rpe == null && next.mobilityMin <= 0) {
    return false;
  }
  state.logs[logKey(week, template, exId)] = next;
  persist();
  return true;
}

export function addCustomExercise(template: TemplateId, exercise: Omit<ExerciseTemplate, "id">): ExerciseTemplate {
  const created: ExerciseTemplate = { ...exercise, id: uid(), name: exercise.name.trim().slice(0, 80) };
  state.custom[template] = [...(state.custom[template] ?? []), created];
  persist();
  return created;
}

export function removeCustomExercise(template: TemplateId, id: string): void {
  state.custom[template] = (state.custom[template] ?? []).filter((e) => e.id !== id);
  if (!state.custom[template].length) delete state.custom[template];
  for (const logId of Object.keys(state.logs)) {
    const parts = logId.split(":");
    if (parts[1] === template && parts.slice(2).join(":") === id) delete state.logs[logId];
  }
  persist();
}

export function setCampStart(iso: string): string {
  const monday = snapToMonday(iso);
  state.startDate = monday;
  state.week = activeCampWeek(monday);
  persist();
  return monday;
}

export function assignDayTemplate(week: number, day: number, template: TemplateId): number | null {
  const layout = [...weekLayout(week)];
  const from = layout.indexOf(template);
  const target = clamp(day, 0, 6);
  if (from < 0 || from === target) return null;
  const displaced = layout[target];
  layout[target] = template;
  layout[from] = displaced;
  const same = layout.every((id, i) => id === state.defaultLayout[i]);
  if (same) delete state.weekPlans[String(week)];
  else state.weekPlans[String(week)] = layout;
  persist();
  return from;
}

export function saveLayoutAsDefault(week: number): void {
  const layout = [...weekLayout(week)];
  const previous = state.defaultLayout;
  for (let w = 1; w < week; w++) {
    if (!state.weekPlans[String(w)]) state.weekPlans[String(w)] = [...previous];
  }
  state.defaultLayout = layout;
  for (let w = week; w <= CAMP_WEEKS; w++) delete state.weekPlans[String(w)];
  persist();
}

export function addPullup(date: string, reps: number): void {
  state.pullups.push({ id: uid(), date, reps: clamp(Math.round(reps), 1, 100) });
  persist();
}

export function addFiveK(date: string, durationSec: number): void {
  state.fivek.push({ id: uid(), date, durationSec: clamp(Math.round(durationSec), 60, 3 * 3600) });
  persist();
}

export function addBodyweight(date: string, kg: number): void {
  state.bodyweight.push({ id: uid(), date, kg: clamp(Math.round(kg * 10) / 10, 30, 250) });
  persist();
}

export function removeBenchmark(kind: "pullup" | "fivek" | "weight", id: string): void {
  if (kind === "pullup") state.pullups = state.pullups.filter((m) => m.id !== id);
  else if (kind === "fivek") state.fivek = state.fivek.filter((m) => m.id !== id);
  else state.bodyweight = state.bodyweight.filter((m) => m.id !== id);
  persist();
}

export function replaceCamp(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const next = normalize(v as Partial<CampState>);
  if ((v as Partial<CampState>).version !== 1) return false;
  state = next;
  persist();
  return true;
}

export function resetCamp(): void {
  state = defaultState();
  persist();
}
