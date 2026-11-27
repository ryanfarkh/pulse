import { addDays, escapeHtml, isToday, parseISO, trimNum } from "../format";
import type { Ui } from "../types";
import { renderDietGoalModal } from "./DietGoalModal";
import { dayTotals, dietDay, getDietState, mealTotals } from "./useDietStore";
import type { Macros } from "./types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

function macroRow(label: string, value: number, goal: number, unit: string, hit: string | null): string {
  const v = Math.round(value);
  const g = Math.round(goal);
  const d = v - g;
  let core = d > 0 ? `+${d.toLocaleString()} ${unit}` : d < 0 ? `${d.toLocaleString()} ${unit}` : "On target";
  if (d >= 0 && hit) core += ` · ${hit}`;
  const met = d >= 0 && g > 0;
  const pct = g > 0 ? Math.min(100, (v / g) * 100) : 0;
  const unitLabel = unit === "kcal" ? "kcal" : "g";
  return `<div class="macro">
    <div class="macro-top">
      <span>${label}</span>
      <b class="${met ? "met" : ""}">${fmt(v)} / ${fmt(g)} ${unitLabel} (${core})</b>
    </div>
    <div class="progress"><i style="width:${pct}%;background:${met ? "var(--green)" : "var(--sky)"}"></i></div>
  </div>`;
}

function logged(totals: Macros): boolean {
  return totals.calories > 0 || totals.protein > 0 || totals.carbs > 0 || totals.fats > 0;
}

export function renderDietDashboard(ui: Ui): string {
  const state = getDietState();
  const goals = state.goals;
  const day = dietDay(ui.dietDate);
  const totals = dayTotals(day);
  const meals = mealTotals(day);
  const date = parseISO(ui.dietDate);
  const heading = isToday(ui.dietDate) ? "Today" : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  const strip = Array.from({ length: 7 }, (_, i) => addDays(ui.dietDate, i - 6)).map((iso) => {
    const t = dayTotals(dietDay(iso));
    const has = logged(t);
    const cal = has && t.calories >= goals.calories;
    const pro = has && t.protein >= goals.protein;
    const d = parseISO(iso);
    const sel = iso === ui.dietDate ? "sel" : "";
    return `<button type="button" class="adhere-day ${sel} ${has ? "logged" : ""}" data-act="diet-goto" data-date="${iso}">
      <span>${DOW[d.getDay()]}</span>
      <b>${d.getDate()}</b>
      <span class="pips"><i class="${cal ? "on" : ""}" title="Calories"></i><i class="pro ${pro ? "on" : ""}" title="Protein"></i></span>
    </button>`;
  });

  const loggedDays = Array.from({ length: 7 }, (_, i) => addDays(ui.dietDate, i - 6))
    .map((iso) => dayTotals(dietDay(iso)))
    .filter(logged);
  const avg =
    loggedDays.length === 0
      ? "No intake logged in these 7 days."
      : `Avg of ${loggedDays.length} logged day${loggedDays.length === 1 ? "" : "s"} · ${fmt(loggedDays.reduce((s, t) => s + t.calories, 0) / loggedDays.length)} kcal · ${fmt(loggedDays.reduce((s, t) => s + t.protein, 0) / loggedDays.length)} g protein`;

  const mealList = day.meals
    .map(
      (m) => `<div class="meal">
        <div>
          <b>${escapeHtml(m.name)}</b>
          <span>${fmt(m.calories)} kcal · P ${trimNum(m.protein)} · C ${trimNum(m.carbs)} · F ${trimNum(m.fats)}</span>
        </div>
        <button type="button" class="icon-x" data-act="diet-del-meal" data-id="${m.id}" aria-label="Delete food">×</button>
      </div>`,
    )
    .join("");

  const mealHint =
    meals.calories > 0 || meals.protein > 0
      ? `Foods add ${fmt(meals.calories)} kcal and ${fmt(meals.protein)} g protein on top of this lump sum.`
      : "Use this for an end-of-day total, or add foods below. Both count toward the bars.";

  return `<div class="topbar">
      <div class="brand"><b>Diet</b><span>End of day</span></div>
      <button type="button" class="ghost tool" data-act="diet-goals">Goals</button>
    </div>
    <p class="goal-note">${escapeHtml(goals.note)}</p>
    <div class="date-nav">
      <button type="button" class="icon-btn" data-act="diet-shift" data-n="-1" aria-label="Previous day">‹</button>
      <button type="button" class="when" data-act="diet-open-cal">
        <b>${heading}</b>
        <span>${ui.dietDate}</span>
      </button>
      <button type="button" class="icon-btn" data-act="diet-shift" data-n="1" aria-label="Next day">›</button>
    </div>
    <button type="button" class="ghost today-jump ${isToday(ui.dietDate) ? "on" : ""}" data-act="diet-today">Today</button>

    <section class="card">
      <h3>Vs goal <span>${fmt(goals.calories)} kcal · ${fmt(goals.protein)} P · ${fmt(goals.carbs)} C · ${fmt(goals.fats)} F</span></h3>
      ${macroRow("Calories", totals.calories, goals.calories, "kcal", "Surplus hit ✓")}
      ${macroRow("Protein", totals.protein, goals.protein, "g", "Goal hit ✓")}
      ${macroRow("Carbs", totals.carbs, goals.carbs, "g", null)}
      ${macroRow("Fats", totals.fats, goals.fats, "g", null)}
    </section>

    <section class="card">
      <h3>7-day adherence <span>kcal · protein</span></h3>
      <div class="adhere">${strip.join("")}</div>
      <p class="hint adhere-legend"><i class="pip"></i> Calories <i class="pip pro"></i> Protein</p>
      <p class="hint">${avg}</p>
    </section>

    <section class="card">
      <h3>End-of-day totals</h3>
      <p class="hint">${mealHint}</p>
      <div class="macro-inputs">
        <label>Calories<input class="input" inputmode="decimal" autocomplete="off" data-act="diet-manual" data-field="calories" value="${day.manual.calories || ""}" /></label>
        <label>Protein<input class="input" inputmode="decimal" autocomplete="off" data-act="diet-manual" data-field="protein" value="${day.manual.protein || ""}" /></label>
        <label>Carbs<input class="input" inputmode="decimal" autocomplete="off" data-act="diet-manual" data-field="carbs" value="${day.manual.carbs || ""}" /></label>
        <label>Fats<input class="input" inputmode="decimal" autocomplete="off" data-act="diet-manual" data-field="fats" value="${day.manual.fats || ""}" /></label>
      </div>
    </section>

    <section class="card">
      <h3>Foods <span>${day.meals.length ? `${day.meals.length} logged` : "Optional"}</span></h3>
      <input class="input" data-diet="name" maxlength="80" placeholder="Meal or food" autocomplete="off" />
      <div class="macro-inputs" style="margin-top:8px">
        <label>kcal<input class="input" inputmode="decimal" data-diet="calories" placeholder="0" /></label>
        <label>P<input class="input" inputmode="decimal" data-diet="protein" placeholder="0" /></label>
        <label>C<input class="input" inputmode="decimal" data-diet="carbs" placeholder="0" /></label>
        <label>F<input class="input" inputmode="decimal" data-diet="fats" placeholder="0" /></label>
      </div>
      <button type="button" class="primary" style="width:100%;margin-top:10px" data-act="diet-add-meal">Add food</button>
      <div class="meals">${mealList || `<p class="hint">Nothing itemized. Totals above still count.</p>`}</div>
    </section>
    ${ui.dietGoals ? renderDietGoalModal(goals) : ""}`;
}
