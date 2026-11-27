import { formatDuration, formatPrettyDate, todayISO, trimNum } from "../format";
import type { CampSheet } from "../types";
import { fivekSnapshot, pullupSnapshot, weightSnapshot } from "./metrics";
import {
  BW_BASELINE,
  FIVEK_TARGET_SEC,
  PULLUP_BASELINE,
  PULLUP_TARGET,
  type CampState,
} from "./types";

function historyRows(rows: string): string {
  if (!rows) return `<p class="hint">No tests logged yet. Baseline stays in place until you add one.</p>`;
  return `<div class="hist">${rows}</div>`;
}

export function renderBenchmarkModal(sheet: CampSheet, state: CampState): string {
  if (sheet !== "pullup" && sheet !== "fivek" && sheet !== "weight") return "";
  const today = todayISO();
  let title = "";
  let fields = "";
  let hist = "";

  if (sheet === "pullup") {
    const snap = pullupSnapshot(state.pullups);
    title = "Pull-up max test";
    fields = `<p class="hint">Baseline ${PULLUP_BASELINE} reps · target ${PULLUP_TARGET}. Best so far: ${snap.logged ? snap.best : "baseline " + PULLUP_BASELINE}.</p>
      <div class="field"><label>Reps</label><input class="input" inputmode="numeric" data-bench="reps" placeholder="${PULLUP_TARGET}" /></div>`;
    hist = historyRows(
      [...state.pullups]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
          (m) => `<div class="hist-row"><span>${formatPrettyDate(m.date)}</span><b>${m.reps} reps</b><button type="button" class="icon-x" data-act="camp-del-bench" data-kind="pullup" data-id="${m.id}" aria-label="Delete test">×</button></div>`,
        )
        .join(""),
    );
  } else if (sheet === "fivek") {
    const snap = fivekSnapshot(state.fivek);
    title = "5 km best time";
    fields = `<p class="hint">Baseline 25:00 · target under ${formatDuration(FIVEK_TARGET_SEC)}. Best so far: ${snap.logged ? formatDuration(snap.best) : "25:00"}.</p>
      <div class="field"><label>Time (mm:ss)</label><input class="input" inputmode="numeric" data-bench="clock" placeholder="22:00" /></div>`;
    hist = historyRows(
      [...state.fivek]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
          (m) => `<div class="hist-row"><span>${formatPrettyDate(m.date)}</span><b>${formatDuration(m.durationSec)}</b><button type="button" class="icon-x" data-act="camp-del-bench" data-kind="fivek" data-id="${m.id}" aria-label="Delete time">×</button></div>`,
        )
        .join(""),
    );
  } else {
    const snap = weightSnapshot(state.bodyweight);
    title = "Bodyweight";
    fields = `<p class="hint">Baseline ${trimNum(BW_BASELINE)} kg. Latest: ${snap.logged ? `${trimNum(snap.kg)} kg` : "not logged yet"}.</p>
      <div class="field"><label>Weight (kg)</label><input class="input" inputmode="decimal" data-bench="kg" placeholder="85.0" /></div>`;
    hist = historyRows(
      [...state.bodyweight]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
          (m) => `<div class="hist-row"><span>${formatPrettyDate(m.date)}</span><b>${trimNum(m.kg)} kg</b><button type="button" class="icon-x" data-act="camp-del-bench" data-kind="weight" data-id="${m.id}" aria-label="Delete weigh-in">×</button></div>`,
        )
        .join(""),
    );
  }

  return `<div class="modal">
    <button type="button" class="modal-backdrop" data-act="camp-close" aria-label="Close"></button>
    <div class="modal-sheet">
      <div class="topbar">
        <div class="brand"><b>${title}</b><span>Logged on this device</span></div>
        <button type="button" class="icon-btn" data-act="camp-close" aria-label="Close">×</button>
      </div>
      ${fields}
      <div class="field"><label>Date</label><input class="input" type="date" data-bench="date" value="${today}" /></div>
      <button type="button" class="primary" style="width:100%;margin-top:12px" data-act="camp-save-bench" data-sheet="${sheet}">Save</button>
      <h3 class="hist-title">Log</h3>
      ${hist}
    </div>
  </div>`;
}

export function renderAddExerciseModal(): string {
  return `<div class="modal">
    <button type="button" class="modal-backdrop" data-act="camp-close" aria-label="Close"></button>
    <div class="modal-sheet">
      <div class="topbar">
        <div class="brand"><b>Add exercise</b><span>Shows on this weekday every camp week</span></div>
        <button type="button" class="icon-btn" data-act="camp-close" aria-label="Close">×</button>
      </div>
      <div class="field"><label>Name</label><input class="input" data-add="name" maxlength="80" placeholder="Face pulls" /></div>
      <div class="field">
        <label>Type</label>
        <select class="input" data-add="kind">
          <option value="strength">Strength</option>
          <option value="kettlebell">Kettlebell</option>
          <option value="run">Run</option>
          <option value="mobility">Mobility</option>
        </select>
      </div>
      <div class="field"><label>Target</label><input class="input" data-add="target" maxlength="120" placeholder="3 sets × 12–15 reps" /></div>
      <label class="check-line"><input type="checkbox" data-add="bw" /> Bodyweight</label>
      <button type="button" class="primary" style="width:100%;margin-top:14px" data-act="camp-save-add">Add to this day</button>
    </div>
  </div>`;
}
