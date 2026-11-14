import "./styles.css";
import { burst, tap, vibrate } from "./confetti";
import { addDays, clamp, parseDuration, paceSecPerKm, formatPace, todayISO, uid } from "./format";
import {
  exportJson,
  getDay,
  getState,
  isValidState,
  patchDay,
  replaceState,
  resetAll,
  setGoals,
  subscribe,
} from "./store";
import { computePRs, detectNewPRs } from "./stats";
import type { ExerciseKey, Goals, Tab } from "./types";
import { DEFAULT_GOALS } from "./types";
import { paintCharts, renderApp, scrollHeatmap, type Ui } from "./ui";

const app = document.getElementById("app")!;
const toastEl = document.getElementById("toast")!;

const ui: Ui = {
  tab: "today",
  date: todayISO(),
  range: "week",
  calendar: false,
};

let lastPrs = computePRs(getState());

function toast(msg: string): void {
  toastEl.hidden = false;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  window.setTimeout(() => toastEl.classList.remove("show"), 1600);
}

function celebrate(msg: string, x?: number, y?: number): void {
  burst(x, y);
  vibrate(24);
  toast(msg);
}

function render(): void {
  const state = getState();
  app.innerHTML = renderApp(state, ui, computePRs(state));
  if (ui.tab === "stats") paintCharts(state, ui.range);
  if (ui.tab === "today") {
    scrollHeatmap();
    bindRunPace();
  }
}

function goalHit(before: number, after: number, goal: number): boolean {
  return before < goal && after >= goal && goal > 0;
}

function bumpReps(ex: ExerciseKey, n: number, source?: Element): void {
  const state = getState();
  const before = getDay(ui.date);
  const prsBefore = computePRs(state);
  const next = clamp(before[ex].reps + n);
  patchDay(ui.date, (d) => {
    d[ex].reps = next;
    if (n > 0 && d[ex].sets === 0) d[ex].sets = 1;
  });
  tap(source ?? null);
  vibrate();
  if (goalHit(before[ex].reps, next, state.goals[ex])) {
    celebrate(`${ex} goal hit`);
  }
  maybePr(prsBefore);
}

function bumpSets(ex: ExerciseKey, n: number): void {
  patchDay(ui.date, (d) => {
    d[ex].sets = clamp(d[ex].sets + n);
  });
  vibrate();
}

function bumpAnki(n: number, source?: Element): void {
  const state = getState();
  const before = getDay(ui.date);
  const prsBefore = computePRs(state);
  const next = clamp(before.anki + n);
  patchDay(ui.date, (d) => {
    d.anki = next;
  });
  tap(source ?? null);
  vibrate();
  if (goalHit(before.anki, next, state.goals.anki)) celebrate("Anki goal hit");
  maybePr(prsBefore);
}

function maybePr(before = lastPrs): void {
  const after = computePRs(getState());
  const fresh = detectNewPRs(before, after);
  lastPrs = after;
  if (fresh[0]) celebrate(`PR · ${fresh[0].label} ${fresh[0].value}`);
}

function runInputs(): { km: number; min: number; sec: number; notes: string } {
  const km = Number((document.querySelector('[data-run="km"]') as HTMLInputElement | null)?.value || 0);
  const min = Number((document.querySelector('[data-run="min"]') as HTMLInputElement | null)?.value || 0);
  const sec = Number((document.querySelector('[data-run="sec"]') as HTMLInputElement | null)?.value || 0);
  const notes = (document.querySelector('[data-run="notes"]') as HTMLTextAreaElement | null)?.value.trim() ?? "";
  return { km, min, sec, notes };
}

function bindRunPace(): void {
  const update = () => {
    const { km, min, sec } = runInputs();
    const el = document.querySelector("[data-run-pace]");
    if (el) el.textContent = formatPace(km, parseDuration(min, sec));
  };
  document.querySelectorAll("[data-run]").forEach((el) => {
    el.addEventListener("input", update);
  });
  update();
}

function addRun(): void {
  const { km, min, sec, notes } = runInputs();
  if (km <= 0) {
    toast("Add a distance");
    return;
  }
  const durationSec = parseDuration(min, sec);
  if (durationSec <= 0) {
    toast("Add a time");
    return;
  }
  const prsBefore = computePRs(getState());
  patchDay(ui.date, (d) => {
    d.runs.push({ id: uid(), distanceKm: Number(km.toFixed(2)), durationSec, notes });
  });
  const pace = paceSecPerKm(km, durationSec);
  celebrate(pace ? `Run logged · ${formatPace(km, durationSec)}` : "Run logged");
  maybePr(prsBefore);
}

function saveGoals(): void {
  const read = (k: keyof Goals) =>
    clamp(Number((document.querySelector(`[data-goal="${k}"]`) as HTMLInputElement | null)?.value || 0), 0, 1e6);
  setGoals({
    pushups: read("pushups") || DEFAULT_GOALS.pushups,
    pullups: read("pullups") || DEFAULT_GOALS.pullups,
    dips: read("dips") || DEFAULT_GOALS.dips,
    anki: read("anki") || DEFAULT_GOALS.anki,
    weeklyRuns: read("weeklyRuns") || DEFAULT_GOALS.weeklyRuns,
  });
  toast("Goals saved");
}

function downloadExport(): void {
  const blob = new Blob([exportJson()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pulse-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exported");
}

function importFile(): void {
  const input = document.getElementById("import-file") as HTMLInputElement | null;
  if (!input) return;
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (!isValidState(parsed)) throw new Error("invalid");
        replaceState(parsed);
        lastPrs = computePRs(parsed);
        toast("Imported");
      } catch {
        toast("Invalid backup file");
      }
    });
    input.value = "";
  };
  input.click();
}

app.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  const el = t.closest("[data-act]") as HTMLElement | null;
  if (!el) return;
  const act = el.dataset.act;
  if (act === "tab") {
    ui.tab = el.dataset.tab as Tab;
    ui.calendar = false;
    render();
    return;
  }
  if (act === "shift") {
    ui.date = addDays(ui.date, Number(el.dataset.n));
    render();
    return;
  }
  if (act === "open-cal") {
    ui.calendar = true;
    render();
    return;
  }
  if (act === "close-cal") {
    ui.calendar = false;
    render();
    return;
  }
  if (act === "goto") {
    ui.date = el.dataset.date ?? ui.date;
    ui.calendar = false;
    ui.tab = "today";
    render();
    return;
  }
  if (act === "cal-month") {
    const n = Number(el.dataset.n);
    const [y, m] = ui.date.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    ui.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    render();
    return;
  }
  if (act === "reps") {
    bumpReps(el.dataset.ex as ExerciseKey, Number(el.dataset.n), el);
    return;
  }
  if (act === "sets") {
    bumpSets(el.dataset.ex as ExerciseKey, Number(el.dataset.n));
    return;
  }
  if (act === "anki") {
    bumpAnki(Number(el.dataset.n), el);
    return;
  }
  if (act === "preset-km") {
    const input = document.querySelector('[data-run="km"]') as HTMLInputElement | null;
    if (input) input.value = String(el.dataset.n);
    bindRunPace();
    return;
  }
  if (act === "add-run") {
    addRun();
    return;
  }
  if (act === "del-run") {
    const id = el.dataset.id;
    patchDay(ui.date, (d) => {
      d.runs = d.runs.filter((r) => r.id !== id);
    });
    return;
  }
  if (act === "range") {
    ui.range = el.dataset.range === "month" ? "month" : "week";
    paintCharts(getState(), ui.range);
    return;
  }
  if (act === "save-goals") {
    saveGoals();
    return;
  }
  if (act === "export") {
    downloadExport();
    return;
  }
  if (act === "import") {
    importFile();
    return;
  }
  if (act === "reset") {
    if (confirm("Clear all Pulse data on this device?")) {
      resetAll();
      lastPrs = computePRs(getState());
      toast("Cleared");
    }
  }
});

app.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.act === "reps-input") {
    const ex = el.dataset.ex as ExerciseKey;
    const value = clamp(Number(el.value || 0));
    const before = getDay(ui.date)[ex].reps;
    const prsBefore = computePRs(getState());
    patchDay(ui.date, (d) => {
      d[ex].reps = value;
    });
    if (goalHit(before, value, getState().goals[ex])) celebrate(`${ex} goal hit`);
    maybePr(prsBefore);
  }
  if (el.dataset.act === "anki-input") {
    const value = clamp(Number(el.value || 0));
    const before = getDay(ui.date).anki;
    const prsBefore = computePRs(getState());
    patchDay(ui.date, (d) => {
      d.anki = value;
    });
    if (goalHit(before, value, getState().goals.anki)) celebrate("Anki goal hit");
    maybePr(prsBefore);
  }
});

subscribe(render);
render();
