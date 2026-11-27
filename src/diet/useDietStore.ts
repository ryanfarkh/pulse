import { clamp, uid } from "../format";
import { createStoreNotify } from "../emit";
import {
  DEFAULT_DIET_GOALS,
  DIET_STORAGE_KEY,
  blankDietDay,
  emptyMacros,
  type DietDay,
  type DietGoals,
  type DietState,
  type Macros,
  type Meal,
} from "./types";

const bus = createStoreNotify();

function defaultState(): DietState {
  return { version: 1, goals: { ...DEFAULT_DIET_GOALS }, days: {} };
}

function num(v: unknown, max = 20000): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? clamp(Math.round(n * 10) / 10, 0, max) : 0;
}

function asMacros(v: unknown): Macros {
  const m = v && typeof v === "object" ? (v as Partial<Macros>) : {};
  return {
    calories: num(m.calories),
    protein: num(m.protein, 1000),
    carbs: num(m.carbs, 2000),
    fats: num(m.fats, 1000),
  };
}

function asMeal(v: unknown): Meal | null {
  if (!v || typeof v !== "object") return null;
  const m = v as Partial<Meal>;
  return {
    id: typeof m.id === "string" && m.id ? m.id : uid(),
    name: typeof m.name === "string" && m.name.trim() ? m.name.trim().slice(0, 80) : "Food",
    ...asMacros(m),
  };
}

function asDay(v: unknown): DietDay {
  const raw = v && typeof v === "object" ? (v as Partial<DietDay>) : {};
  return {
    manual: asMacros(raw.manual),
    meals: Array.isArray(raw.meals) ? raw.meals.map(asMeal).filter((m): m is Meal => !!m) : [],
  };
}

function normalize(raw: Partial<DietState> | null): DietState {
  const base = defaultState();
  if (!raw || raw.version !== 1) return base;
  const days: Record<string, DietDay> = {};
  if (raw.days && typeof raw.days === "object") {
    for (const [date, day] of Object.entries(raw.days)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) days[date] = asDay(day);
    }
  }
  const goals = raw.goals && typeof raw.goals === "object" ? (raw.goals as Partial<DietGoals>) : {};
  return {
    version: 1,
    goals: {
      calories: num(goals.calories ?? DEFAULT_DIET_GOALS.calories) || DEFAULT_DIET_GOALS.calories,
      protein: num(goals.protein ?? DEFAULT_DIET_GOALS.protein, 1000) || DEFAULT_DIET_GOALS.protein,
      carbs: num(goals.carbs ?? DEFAULT_DIET_GOALS.carbs, 2000) || DEFAULT_DIET_GOALS.carbs,
      fats: num(goals.fats ?? DEFAULT_DIET_GOALS.fats, 1000) || DEFAULT_DIET_GOALS.fats,
      note: typeof goals.note === "string" && goals.note.trim() ? goals.note.trim().slice(0, 280) : DEFAULT_DIET_GOALS.note,
    },
    days,
  };
}

function load(): DietState {
  try {
    const raw = localStorage.getItem(DIET_STORAGE_KEY);
    if (!raw) return defaultState();
    return normalize(JSON.parse(raw) as Partial<DietState>);
  } catch {
    return defaultState();
  }
}

let state: DietState = load();

function persist(): void {
  localStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(state));
  bus.notify();
}

export function getDietState(): DietState {
  return state;
}

export function subscribeDiet(fn: () => void): () => void {
  return bus.subscribe(fn);
}

export function dietDay(date: string): DietDay {
  return state.days[date] ?? blankDietDay();
}

export function dayTotals(day: DietDay): Macros {
  const totals = { ...day.manual };
  for (const meal of day.meals) {
    totals.calories += meal.calories;
    totals.protein += meal.protein;
    totals.carbs += meal.carbs;
    totals.fats += meal.fats;
  }
  return totals;
}

export function mealTotals(day: DietDay): Macros {
  return dayTotals({ manual: emptyMacros(), meals: day.meals });
}

function isEmpty(day: DietDay): boolean {
  const t = dayTotals(day);
  return t.calories === 0 && t.protein === 0 && t.carbs === 0 && t.fats === 0 && day.meals.length === 0;
}

export function patchDietDay(date: string, patch: (day: DietDay) => void): DietDay {
  const day = state.days[date] ? structuredClone(state.days[date]) : blankDietDay();
  patch(day);
  if (isEmpty(day)) delete state.days[date];
  else state.days[date] = day;
  persist();
  return state.days[date] ?? day;
}

export function setDietGoals(goals: DietGoals): void {
  state.goals = {
    calories: num(goals.calories) || DEFAULT_DIET_GOALS.calories,
    protein: num(goals.protein, 1000) || DEFAULT_DIET_GOALS.protein,
    carbs: num(goals.carbs, 2000) || DEFAULT_DIET_GOALS.carbs,
    fats: num(goals.fats, 1000) || DEFAULT_DIET_GOALS.fats,
    note: goals.note.trim().slice(0, 280) || DEFAULT_DIET_GOALS.note,
  };
  persist();
}

export function replaceDiet(v: unknown): boolean {
  if (!v || typeof v !== "object" || (v as Partial<DietState>).version !== 1) return false;
  state = normalize(v as Partial<DietState>);
  persist();
  return true;
}

export function resetDiet(): void {
  state = defaultState();
  persist();
}
