export const DIET_STORAGE_KEY = "pulse.diet.v1";

export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type Meal = Macros & {
  id: string;
  name: string;
};

export type DietDay = {
  manual: Macros;
  meals: Meal[];
};

export type DietGoals = Macros & {
  note: string;
};

export type DietState = {
  version: 1;
  goals: DietGoals;
  days: Record<string, DietDay>;
};

export const DEFAULT_DIET_GOALS: DietGoals = {
  calories: 3600,
  protein: 175,
  carbs: 500,
  fats: 95,
  note: "Lean Mass Gain: 85 kg -> ~90 kg in 12 weeks while running 5km < 22:00",
};

export function emptyMacros(): Macros {
  return { calories: 0, protein: 0, carbs: 0, fats: 0 };
}

export function blankDietDay(): DietDay {
  return { manual: emptyMacros(), meals: [] };
}
