import { escapeHtml } from "../format";
import type { DietGoals } from "./types";

export function renderDietGoalModal(goals: DietGoals): string {
  return `<div class="modal">
    <button type="button" class="modal-backdrop" data-act="diet-close-goals" aria-label="Close"></button>
    <div class="modal-sheet">
      <div class="topbar">
        <div class="brand"><b>Daily goals</b><span>Camp surplus targets</span></div>
        <button type="button" class="icon-btn" data-act="diet-close-goals" aria-label="Close">×</button>
      </div>
      <div class="goal-grid">
        <div class="field"><label>Calories</label><input class="input" inputmode="numeric" data-dgoal="calories" value="${goals.calories}" /></div>
        <div class="field"><label>Protein (g)</label><input class="input" inputmode="decimal" data-dgoal="protein" value="${goals.protein}" /></div>
        <div class="field"><label>Carbs (g)</label><input class="input" inputmode="decimal" data-dgoal="carbs" value="${goals.carbs}" /></div>
        <div class="field"><label>Fats (g)</label><input class="input" inputmode="decimal" data-dgoal="fats" value="${goals.fats}" /></div>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Goal note</label>
        <textarea class="input" data-dgoal="note" maxlength="280">${escapeHtml(goals.note)}</textarea>
      </div>
      <button type="button" class="primary" style="width:100%;margin-top:14px" data-act="diet-save-goals">Save goals</button>
    </div>
  </div>`;
}
