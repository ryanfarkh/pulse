import { todayISO } from "../format";
import { renderExerciseCard, type DayExercise } from "./ExerciseLogCard";
import { DAY_LABELS, DAY_NAMES, TEMPLATES, exercisesForTemplate, templateById } from "./program";
import { campDate, campDayLabel } from "./schedule";
import { getCampState, getExerciseLog, logKey, templateForDay, weekLayout } from "./useCampStore";

export function renderCampDayView(day: number): string {
  const state = getCampState();
  const week = state.week;
  const layout = weekLayout(week);
  const templateId = templateForDay(week, day);
  const workout = templateById(templateId);
  const custom = state.custom[templateId] ?? [];
  const exercises: DayExercise[] = [
    ...exercisesForTemplate(templateId, []).map((e) => ({ ...e, custom: false })),
    ...custom.map((e) => ({ ...e, custom: true })),
  ];
  const today = todayISO();
  const cards = exercises
    .map((ex) => {
      const log = getExerciseLog(week, templateId, ex.id);
      const previous = week > 1 ? (state.logs[logKey(week - 1, templateId, ex.id)] ?? null) : null;
      return renderExerciseCard(ex, log, previous);
    })
    .join("");
  const viewed = campDate(state.startDate, week, day);
  const options = TEMPLATES.map((t) => {
    const on = t.id === templateId ? "selected" : "";
    return `<option value="${t.id}" ${on}>${t.id} · ${t.title}</option>`;
  }).join("");
  const plan = layout
    .map((id, i) => {
      const date = campDate(state.startDate, week, i);
      const on = i === day ? "on" : "";
      const todayCls = date === today ? "today" : "";
      const label = campDayLabel(date).split(" ").slice(1).join(" ");
      return `<button type="button" class="${on} ${todayCls}" data-act="camp-day" data-day="${i}" aria-pressed="${i === day}">
        <b>${DAY_LABELS[i]}</b>
        <small>${label}</small>
        <em>${templateById(id).short}</em>
      </button>`;
    })
    .join("");

  return `<div class="week-plan" role="tablist" aria-label="Week schedule">${plan}</div>
    <div class="assign-row">
      <label class="field">
        <span>Swap / Assign day</span>
        <select class="input" data-act="camp-assign">${options}</select>
      </label>
      <button type="button" class="ghost" data-act="camp-save-default">Set as my default weekly layout</button>
    </div>
    <div class="day-title">
      <b>${DAY_NAMES[day]} · ${campDayLabel(viewed).slice(4)}</b>
      <span>${workout.title}</span>
    </div>
    ${cards}
    <button type="button" class="ghost add-day" data-act="camp-open" data-sheet="add">Add exercise</button>`;
}
