import { escapeHtml, formatDuration, formatPace, trimNum } from "../format";
import { lastLabel, sessionOverloaded } from "./metrics";
import { KB_WEIGHTS, type ExerciseLog, type ExerciseTemplate, type SetEntry } from "./types";

export type DayExercise = ExerciseTemplate & { custom?: boolean };

function weightValue(w: number | null): string {
  if (w == null) return "";
  if (w === 0) return "BW";
  return trimNum(w);
}

function focusWeight(sets: SetEntry[]): number | null | undefined {
  if (!sets.length) return undefined;
  const open = sets.find((s) => !s.done) ?? sets[sets.length - 1];
  return open.weightKg;
}

function setRow(ex: DayExercise, row: SetEntry | null, index: number): string {
  const idAttr = row ? `data-id="${row.id}"` : `data-index="${index}"`;
  const weight = row ? weightValue(row.weightKg) : "";
  const reps = row && row.reps > 0 ? String(row.reps) : "";
  const done = row?.done ? "on" : "";
  const pressed = row?.done ? "true" : "false";
  const remove = row
    ? `<button type="button" class="icon-x" data-act="camp-del-set" data-ex="${ex.id}" data-id="${row.id}" aria-label="Remove set">×</button>`
    : `<span></span>`;
  return `<div class="set-row">
    <span class="set-n">${index + 1}</span>
    <input class="set-in" inputmode="decimal" autocomplete="off" placeholder="${ex.bodyweight ? "BW" : "kg"}" aria-label="Weight kilograms" data-act="camp-weight" data-live-weight="1" data-ex="${ex.id}" data-sets="${ex.sets}" ${idAttr} value="${escapeHtml(weight)}" />
    <input class="set-in" inputmode="numeric" autocomplete="off" placeholder="reps" aria-label="Reps" data-act="camp-reps" data-ex="${ex.id}" data-sets="${ex.sets}" ${idAttr} value="${reps}" />
    <button type="button" class="check ${done}" data-act="camp-done" data-ex="${ex.id}" data-sets="${ex.sets}" ${idAttr} aria-label="Set done" aria-pressed="${pressed}">✓</button>
    ${remove}
  </div>`;
}

function strengthBlock(ex: DayExercise, log: ExerciseLog): string {
  const stored = log.sets.length > 0;
  const count = stored ? log.sets.length : Math.max(ex.sets, 0);
  const rows = Array.from({ length: count }, (_, i) => setRow(ex, stored ? log.sets[i] : null, i)).join("");
  const focus = focusWeight(log.sets);
  const pills =
    ex.kind === "kettlebell"
      ? `<div class="pills" role="group" aria-label="Kettlebell weight">
          ${KB_WEIGHTS.map((w) => {
            const on = focus === w ? "on" : "";
            const label = w === 0 ? "BW" : trimNum(w);
            const kg = w === 0 ? "bw" : String(w);
            return `<button type="button" class="pill ${on}" data-act="camp-pill" data-ex="${ex.id}" data-sets="${ex.sets}" data-kg="${kg}">${label}</button>`;
          }).join("")}
        </div>`
      : "";
  return `${pills}
    <div class="set-head"><span>#</span><span>Weight</span><span>Reps</span><span>Done</span><span></span></div>
    ${rows}
    <button type="button" class="ghost add-set" data-act="camp-add-set" data-ex="${ex.id}" data-sets="${ex.sets}">Add set</button>`;
}

function runBlock(ex: DayExercise, log: ExerciseLog): string {
  const km = log.distanceKm > 0 ? trimNum(log.distanceKm) : "";
  const time = log.durationSec > 0 ? formatDuration(log.durationSec) : "";
  const pace = log.distanceKm > 0 && log.durationSec > 0 ? formatPace(log.distanceKm, log.durationSec) : "—";
  const rpe = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    return `<button type="button" class="pill ${log.rpe === n ? "on" : ""}" data-act="camp-rpe" data-ex="${ex.id}" data-n="${n}">${n}</button>`;
  }).join("");
  return `<div class="field-row">
      <div class="field">
        <label>Distance (km)</label>
        <input class="input" inputmode="decimal" autocomplete="off" placeholder="5" data-act="camp-run-km" data-live="km" data-ex="${ex.id}" value="${km}" />
      </div>
      <div class="field">
        <label>Duration (mm:ss)</label>
        <input class="input" inputmode="numeric" autocomplete="off" placeholder="22:00" data-act="camp-run-time" data-live="time" data-ex="${ex.id}" value="${escapeHtml(time)}" />
      </div>
    </div>
    <p class="pace-line">Pace <b data-live-pace="${ex.id}">${pace}</b></p>
    <div class="field">
      <label>RPE</label>
      <div class="pills" role="group" aria-label="RPE">${rpe}</div>
    </div>`;
}

function mobilityBlock(ex: DayExercise, log: ExerciseLog): string {
  const mins = log.mobilityMin > 0 ? trimNum(log.mobilityMin) : "";
  return `<button type="button" class="primary ${log.mobilityDone ? "done-on" : ""}" data-act="camp-mob" data-ex="${ex.id}">
      ${log.mobilityDone ? "Completed ✓" : "Mark completed"}
    </button>
    <div class="field" style="margin-top:10px">
      <label>Duration (min, optional)</label>
      <input class="input" inputmode="numeric" autocomplete="off" placeholder="10" data-act="camp-mob-min" data-ex="${ex.id}" value="${mins}" />
    </div>`;
}

export function renderExerciseCard(ex: DayExercise, log: ExerciseLog, previous: ExerciseLog | null): string {
  const overload = sessionOverloaded(ex.kind, log, previous);
  const lastText = lastLabel(previous, !!ex.bodyweight, ex.kind);
  const remove = ex.custom
    ? `<button type="button" class="text-btn danger" data-act="camp-del-ex" data-ex="${ex.id}">Remove</button>`
    : "";
  const body =
    ex.kind === "run" ? runBlock(ex, log) : ex.kind === "mobility" ? mobilityBlock(ex, log) : strengthBlock(ex, log);
  return `<article class="card ex-card">
    <h3 class="ex-head">
      <span class="ex-name">${escapeHtml(ex.name)}</span>
      ${overload ? `<span class="overload">PR / Overload ↑</span>` : ""}
    </h3>
    <p class="ex-target">${escapeHtml(ex.target)}</p>
    <div class="last-row">
      <span>Last: ${escapeHtml(lastText)}</span>
      <span class="last-actions">
        ${remove}
        <button type="button" data-act="camp-copy" data-ex="${ex.id}">Copy last week</button>
      </span>
    </div>
    ${body}
  </article>`;
}
