import { addDays, clamp, todayISO, uid } from "../format";
import type { Ui } from "../types";
import { DEFAULT_DIET_GOALS, type Macros } from "./types";
import { dayTotals, dietDay, getDietState, patchDietDay, setDietGoals } from "./useDietStore";

function readDiet(name: string): string {
  return (document.querySelector(`[data-diet="${name}"]`) as HTMLInputElement | null)?.value ?? "";
}

function readNum(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 10) / 10) : 0;
}

function celebrate(before: Macros, date: string, toast: (message: string) => void): void {
  const after = dayTotals(dietDay(date));
  const goals = getDietState().goals;
  if (before.calories < goals.calories && after.calories >= goals.calories) toast("Calorie surplus hit");
  else if (before.protein < goals.protein && after.protein >= goals.protein) toast("Protein goal hit");
}

export function handleDietClick(
  act: string,
  el: HTMLElement,
  ui: Ui,
  toast: (message: string) => void,
  render: () => void,
): void {
  if (act === "diet-shift") {
    ui.dietDate = addDays(ui.dietDate, Number(el.dataset.n) || 0);
    render();
    return;
  }
  if (act === "diet-today") {
    ui.dietDate = todayISO();
    render();
    return;
  }
  if (act === "diet-goto") {
    if (el.dataset.date) ui.dietDate = el.dataset.date;
    render();
    return;
  }
  if (act === "diet-open-cal") {
    ui.calendar = true;
    ui.calFor = "diet";
    render();
    return;
  }
  if (act === "diet-goals") {
    ui.dietGoals = true;
    render();
    return;
  }
  if (act === "diet-close-goals") {
    ui.dietGoals = false;
    render();
    return;
  }
  if (act === "diet-save-goals") {
    const goal = (key: keyof Macros, fallback: number, max: number) => {
      const raw = (document.querySelector(`[data-dgoal="${key}"]`) as HTMLInputElement | null)?.value ?? "";
      if (!raw.trim()) return fallback;
      const n = Number(raw);
      return Number.isFinite(n) ? clamp(n, 0, max) : fallback;
    };
    const note = (document.querySelector(`[data-dgoal="note"]`) as HTMLTextAreaElement | null)?.value ?? "";
    ui.dietGoals = false;
    setDietGoals({
      calories: goal("calories", DEFAULT_DIET_GOALS.calories, 20000),
      protein: goal("protein", DEFAULT_DIET_GOALS.protein, 1000),
      carbs: goal("carbs", DEFAULT_DIET_GOALS.carbs, 2000),
      fats: goal("fats", DEFAULT_DIET_GOALS.fats, 1000),
      note,
    });
    toast("Goals saved");
    return;
  }
  if (act === "diet-add-meal") {
    const name = readDiet("name").trim();
    const calories = readNum(readDiet("calories"));
    const protein = readNum(readDiet("protein"));
    const carbs = readNum(readDiet("carbs"));
    const fats = readNum(readDiet("fats"));
    if (!name && calories === 0 && protein === 0 && carbs === 0 && fats === 0) {
      toast("Add a food");
      return;
    }
    const before = { ...dayTotals(dietDay(ui.dietDate)) };
    patchDietDay(ui.dietDate, (day) => {
      day.meals.push({
        id: uid(),
        name: name || "Food",
        calories,
        protein,
        carbs,
        fats,
      });
    });
    celebrate(before, ui.dietDate, toast);
    return;
  }
  if (act === "diet-del-meal") {
    const id = el.dataset.id;
    patchDietDay(ui.dietDate, (day) => {
      day.meals = day.meals.filter((m) => m.id !== id);
    });
  }
}

export function handleDietChange(el: HTMLInputElement, ui: Ui, toast: (message: string) => void): void {
  if (el.dataset.act !== "diet-manual") return;
  const field = el.dataset.field;
  if (field !== "calories" && field !== "protein" && field !== "carbs" && field !== "fats") return;
  const before = { ...dayTotals(dietDay(ui.dietDate)) };
  const value = readNum(el.value);
  patchDietDay(ui.dietDate, (day) => {
    day.manual[field] = value;
  });
  celebrate(before, ui.dietDate, toast);
}
