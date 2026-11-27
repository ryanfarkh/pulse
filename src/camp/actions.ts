import { vibrate } from "../confetti";
import { clamp, formatPace, mondayIndex, parseClock, parseWeight, todayISO, uid } from "../format";
import type { CampSheet, Ui } from "../types";
import { DAY_NAMES, isTemplateId } from "./program";
import { activeCampWeek, campDayLabel } from "./schedule";
import type { ExerciseKind, SetEntry, TemplateId } from "./types";
import {
  addBodyweight,
  addCustomExercise,
  addFiveK,
  addPullup,
  assignDayTemplate,
  copyPreviousWeek,
  ensureSet,
  getCampState,
  patchExercise,
  removeBenchmark,
  removeCustomExercise,
  saveLayoutAsDefault,
  setCampStart,
  setCampWeek,
  templateForDay,
} from "./useCampStore";

function read(selector: string): string {
  const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  return el?.value ?? "";
}

function focus(ui: Ui): { day: number; week: number; template: TemplateId } {
  const state = getCampState();
  const day = clamp(ui.campDay, 0, 6);
  const week = state.week;
  return { day, week, template: templateForDay(week, day) };
}

export function handleCampClick(
  act: string,
  el: HTMLElement,
  ui: Ui,
  toast: (message: string) => void,
  render: () => void,
): void {
  const { week, template } = focus(ui);
  const exId = el.dataset.ex ?? "";
  const suggested = Number(el.dataset.sets || 0);

  if (act === "camp-week") {
    const weekNum = Number(el.dataset.week);
    if (Number.isFinite(weekNum)) setCampWeek(weekNum);
    return;
  }
  if (act === "camp-day") {
    const next = Number(el.dataset.day);
    if (!Number.isFinite(next)) return;
    ui.campDay = clamp(next, 0, 6);
    render();
    return;
  }
  if (act === "camp-now") {
    ui.campSynced = true;
    ui.campDay = mondayIndex();
    setCampWeek(activeCampWeek(getCampState().startDate));
    render();
    return;
  }
  if (act === "camp-save-default") {
    saveLayoutAsDefault(week);
    toast("Default layout saved for this week and later weeks");
    return;
  }
  if (act === "camp-open") {
    ui.campSheet = (el.dataset.sheet as CampSheet) ?? null;
    render();
    return;
  }
  if (act === "camp-close") {
    ui.campSheet = null;
    render();
    return;
  }
  if (act === "camp-save-bench") {
    saveBenchmark(el.dataset.sheet ?? "", ui, toast);
    return;
  }
  if (act === "camp-del-bench") {
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    if ((kind === "pullup" || kind === "fivek" || kind === "weight") && id) removeBenchmark(kind, id);
    return;
  }
  if (act === "camp-save-add") {
    saveCustom(template, ui, toast);
    return;
  }
  if (act === "camp-copy") {
    toast(copyPreviousWeek(week, template, exId) ? "Copied last week" : "Nothing logged last week");
    return;
  }
  if (act === "camp-del-ex") {
    if (confirm("Remove this exercise from this workout?")) removeCustomExercise(template, exId);
    return;
  }
  if (act === "camp-pill") {
    const kg = el.dataset.kg === "bw" ? 0 : Number(el.dataset.kg);
    if (!Number.isFinite(kg)) return;
    patchExercise(week, template, exId, (log) => {
      const index = log.sets.findIndex((s) => !s.done);
      const target = index === -1 ? log.sets.length : index;
      ensureSet(log, target, Math.max(suggested, target + 1));
      log.sets[target].weightKg = kg;
    });
    vibrate();
    return;
  }
  if (act === "camp-add-set") {
    patchExercise(week, template, exId, (log) => {
      if (log.sets.length === 0 && suggested > 0) ensureSet(log, suggested, suggested + 1);
      else log.sets.push({ id: uid(), weightKg: null, reps: 0, done: false });
    });
    return;
  }
  if (act === "camp-del-set") {
    const id = el.dataset.id;
    patchExercise(week, template, exId, (log) => {
      log.sets = log.sets.filter((s) => s.id !== id);
    });
    return;
  }
  if (act === "camp-done") {
    toggleDone(week, template, exId, el, suggested);
    vibrate();
    return;
  }
  if (act === "camp-mob") {
    patchExercise(week, template, exId, (log) => {
      log.mobilityDone = !log.mobilityDone;
    });
    vibrate();
    return;
  }
  if (act === "camp-rpe") {
    const n = Number(el.dataset.n);
    if (!Number.isFinite(n)) return;
    patchExercise(week, template, exId, (log) => {
      log.rpe = log.rpe === n ? null : n;
    });
  }
}

function toggleDone(week: number, template: TemplateId, exId: string, el: HTMLElement, suggested: number): void {
  const id = el.dataset.id;
  const indexAttr = el.dataset.index;
  patchExercise(week, template, exId, (log) => {
    if (id) {
      const row = log.sets.find((s) => s.id === id);
      if (row) row.done = !row.done;
      return;
    }
    if (indexAttr != null) {
      const row = ensureSet(log, Number(indexAttr), suggested);
      row.done = true;
    }
  });
}

function saveBenchmark(sheet: string, ui: Ui, toast: (message: string) => void): void {
  const date = read("[data-bench=date]") || todayISO();
  if (sheet === "pullup") {
    const reps = Number(read("[data-bench=reps]"));
    if (!Number.isFinite(reps) || reps <= 0) {
      toast("Add a rep count");
      return;
    }
    ui.campSheet = null;
    addPullup(date, reps);
    toast("Pull-up test saved");
    return;
  }
  if (sheet === "fivek") {
    const sec = parseClock(read("[data-bench=clock]"));
    if (!sec) {
      toast("Use mm:ss");
      return;
    }
    ui.campSheet = null;
    addFiveK(date, sec);
    toast("5 km time saved");
    return;
  }
  if (sheet === "weight") {
    const kg = Number(read("[data-bench=kg]"));
    if (!Number.isFinite(kg) || kg <= 0) {
      toast("Add a weight");
      return;
    }
    ui.campSheet = null;
    addBodyweight(date, kg);
    toast("Weight saved");
  }
}

function saveCustom(template: TemplateId, ui: Ui, toast: (message: string) => void): void {
  const name = read("[data-add=name]").trim();
  if (!name) {
    toast("Name the exercise");
    return;
  }
  const kind = read("[data-add=kind]") as ExerciseKind;
  const safeKind: ExerciseKind =
    kind === "kettlebell" || kind === "run" || kind === "mobility" ? kind : "strength";
  const target = read("[data-add=target]").trim();
  const bw = (document.querySelector("[data-add=bw]") as HTMLInputElement | null)?.checked ?? false;
  ui.campSheet = null;
  addCustomExercise(template, {
    name,
    target,
    kind: safeKind,
    sets: safeKind === "run" || safeKind === "mobility" ? 0 : 3,
    bodyweight: bw,
  });
  toast("Exercise added");
}

export function handleCampChange(el: HTMLInputElement | HTMLSelectElement, ui: Ui, toast: (message: string) => void): void {
  const act = el.dataset.act;
  const { day, week, template } = focus(ui);
  const exId = el.dataset.ex ?? "";
  const suggested = Number(el.dataset.sets || 0);

  if (act === "camp-start") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(el.value)) return;
    ui.campSynced = true;
    const monday = setCampStart(el.value);
    toast(monday === el.value ? "Camp start saved" : `Weeks start Monday · ${campDayLabel(monday)}`);
    return;
  }
  if (act === "camp-assign") {
    if (!isTemplateId(el.value)) return;
    const from = assignDayTemplate(week, day, el.value);
    if (from == null) return;
    toast(`Swapped with ${DAY_NAMES[from]}`);
    return;
  }
  if (act === "camp-weight" || act === "camp-reps") {
    const id = el.dataset.id;
    const indexAttr = el.dataset.index;
    patchExercise(week, template, exId, (log) => {
      let row: SetEntry | undefined;
      if (id) row = log.sets.find((s) => s.id === id);
      else if (indexAttr != null) row = ensureSet(log, Number(indexAttr), suggested);
      if (!row) return;
      if (act === "camp-weight") row.weightKg = parseWeight(el.value);
      else {
        const reps = Math.round(Number(el.value || 0));
        row.reps = Number.isFinite(reps) ? clamp(reps, 0, 999) : 0;
      }
    });
    return;
  }
  if (act === "camp-run-km" || act === "camp-run-time" || act === "camp-mob-min") {
    let invalid = false;
    patchExercise(week, template, exId, (log) => {
      if (act === "camp-run-km") {
        const n = Number(el.value);
        log.distanceKm = Number.isFinite(n) ? clamp(Math.round(n * 100) / 100, 0, 200) : 0;
        return;
      }
      if (act === "camp-run-time") {
        if (!el.value.trim()) {
          log.durationSec = 0;
          return;
        }
        const sec = parseClock(el.value);
        if (sec == null) {
          invalid = true;
          return;
        }
        log.durationSec = sec;
        return;
      }
      const n = Number(el.value);
      log.mobilityMin = Number.isFinite(n) ? clamp(n, 0, 180) : 0;
    });
    if (invalid) toast("Use mm:ss");
  }
}

export function bindCampLive(): void {
  document.querySelectorAll<HTMLInputElement>("[data-live]").forEach((el) => {
    el.addEventListener("input", () => {
      const ex = el.dataset.ex;
      if (!ex) return;
      const kmEl = document.querySelector(`[data-live="km"][data-ex="${CSS.escape(ex)}"]`) as HTMLInputElement | null;
      const timeEl = document.querySelector(`[data-live="time"][data-ex="${CSS.escape(ex)}"]`) as HTMLInputElement | null;
      const paceEl = document.querySelector(`[data-live-pace="${CSS.escape(ex)}"]`);
      const km = Number(kmEl?.value || 0);
      const sec = parseClock(timeEl?.value || "");
      if (paceEl) paceEl.textContent = sec && km > 0 ? formatPace(km, sec) : "—";
    });
  });
}
