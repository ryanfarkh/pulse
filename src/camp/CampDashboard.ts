import { formatDuration } from "../format";
import type { Ui } from "../types";
import { renderAddExerciseModal, renderBenchmarkModal } from "./BenchmarkModal";
import { renderCampDayView } from "./CampDayView";
import { fivekSnapshot, pullupSnapshot, weightSnapshot } from "./metrics";
import {
  BW_BASELINE,
  CAMP_WEEKS,
  FIVEK_TARGET_SEC,
  PULLUP_BASELINE,
  PULLUP_TARGET,
  isDeload,
} from "./types";
import { getCampState } from "./useCampStore";

function bar(pct: number, hit: boolean): string {
  const width = Math.round(pct * 100);
  const color = hit ? "var(--green)" : "var(--sky)";
  return `<div class="progress bench-bar"><i style="width:${width}%;background:${color}"></i></div>`;
}

export function renderCampDashboard(ui: Ui): string {
  const state = getCampState();
  const week = state.week;
  const deload = isDeload(week);
  const pull = pullupSnapshot(state.pullups);
  const five = fivekSnapshot(state.fivek);
  const weight = weightSnapshot(state.bodyweight);
  const weightDelta = `${weight.delta > 0 ? "+" : ""}${weight.delta.toFixed(1)} kg`;

  const weeks = Array.from({ length: CAMP_WEEKS }, (_, i) => {
    const n = i + 1;
    const on = n === week ? "on" : "";
    const mark = isDeload(n) ? "deload" : "";
    return `<button type="button" class="week-chip ${on} ${mark}" data-act="camp-week" data-week="${n}" aria-pressed="${n === week}">
      <b>W${n}</b>
      ${isDeload(n) ? "<small>Deload</small>" : "<small>&nbsp;</small>"}
    </button>`;
  }).join("");

  return `<div class="topbar">
      <div class="brand">
        <b>Camp</b>
        <span>Week ${week} of ${CAMP_WEEKS}${deload ? " · Deload week" : ""} · 12-week block</span>
      </div>
    </div>
    <div class="week-scroll">${weeks}</div>
    ${deload ? `<div class="deload-banner">Deload week — keep the movements, cut load, and leave more reps in reserve.</div>` : ""}
    <div class="bench-grid">
      <button type="button" class="bench" data-act="camp-open" data-sheet="pullup">
        <span class="k">Pull-up max</span>
        <b>${pull.best}${pull.hit ? " ✓" : ""}</b>
        <small>${PULLUP_BASELINE} → ${PULLUP_TARGET} reps</small>
        ${bar(pull.pct, pull.hit)}
      </button>
      <button type="button" class="bench" data-act="camp-open" data-sheet="fivek">
        <span class="k">5 km best</span>
        <b>${formatDuration(five.best)}${five.hit ? " ✓" : ""}</b>
        <small>25:00 → &lt; ${formatDuration(FIVEK_TARGET_SEC)}</small>
        ${bar(five.pct, five.hit)}
      </button>
      <button type="button" class="bench" data-act="camp-open" data-sheet="weight">
        <span class="k">Bodyweight</span>
        <b>${weight.kg.toFixed(1)}</b>
        <small>${weight.logged ? `${weightDelta} vs ${BW_BASELINE.toFixed(1)} kg` : "Baseline"}</small>
        <span class="bench-tap">Log</span>
      </button>
    </div>
    ${renderCampDayView(ui.campDay)}
    ${ui.campSheet === "add" ? renderAddExerciseModal() : renderBenchmarkModal(ui.campSheet, state)}`;
}
