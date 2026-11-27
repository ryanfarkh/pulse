import { renderExerciseCard, type DayExercise } from "./ExerciseLogCard";
import { DAY_LABELS, DAY_NAMES, PROGRAM, exercisesForDay } from "./program";
import { getCampState, getExerciseLog, logKey } from "./useCampStore";
import { mondayIndex } from "../format";

export function renderCampDayView(day: number): string {
  const state = getCampState();
  const custom = state.custom[String(day)] ?? [];
  const exercises: DayExercise[] = [
    ...exercisesForDay(day, []).map((e) => ({ ...e, custom: false })),
    ...custom.map((e) => ({ ...e, custom: true })),
  ];
  const today = mondayIndex();
  const week = state.week;
  const cards = exercises
    .map((ex) => {
      const log = getExerciseLog(week, day, ex.id);
      const previous = week > 1 ? (state.logs[logKey(week - 1, day, ex.id)] ?? null) : null;
      return renderExerciseCard(ex, log, previous);
    })
    .join("");

  return `<div class="day-seg" role="tablist" aria-label="Training day">
      ${DAY_LABELS.map((label, i) => {
        const on = i === day ? "on" : "";
        const todayCls = i === today ? "today" : "";
        return `<button type="button" class="${on} ${todayCls}" data-act="camp-day" data-day="${i}" aria-pressed="${i === day}">${label}</button>`;
      }).join("")}
    </div>
    <div class="day-title">
      <b>${DAY_NAMES[day]}</b>
      <span>${PROGRAM[day].title}</span>
    </div>
    ${cards}
    <button type="button" class="ghost add-day" data-act="camp-open" data-sheet="add">Add exercise</button>`;
}
