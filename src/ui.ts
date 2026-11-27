import { drawBars, drawLine } from "./charts";
import { renderCampDashboard } from "./camp/CampDashboard";
import { renderDietDashboard } from "./diet/DietDashboard";
import { getDietState } from "./diet/useDietStore";
import { addDays, formatDuration, formatMonthDay, formatPace, formatPrettyDate, isToday, parseISO, todayISO } from "./format";
import { currentStreak, heatmap, ringProgress, runsThisWeek, runSeries, volumeSeries, type PR } from "./stats";
import { blankDay } from "./store";
import type { AppState, DayLog, Range, Tab, Ui } from "./types";
import { EXERCISES, PRAYERS, prayerCount } from "./types";

export type { Ui };

const COLORS = {
  pushups: "#f97316",
  pullups: "#38bdf8",
  dips: "#fb7185",
  squats: "#84cc16",
  anki: "#a78bfa",
  run: "#22c55e",
  prayer: "#fbbf24",
};

function icon(name: Tab): string {
  const paths: Record<Tab, string> = {
    today:
      '<path d="M4 12a8 8 0 1 0 16 0A8 8 0 0 0 4 12Zm8-5v5l3 2" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round"/>',
    stats:
      '<path d="M5 19V9m7 10V5m7 14v-7" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round"/>',
    camp:
      '<path d="M5 21V4m0 0h12l-3 4.2L17 12H5" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
    diet:
      '<path d="M8 3v8a2 2 0 1 1-4 0V3m4 4H4m12.5-4c0 4-2 6-2 6h-2.5S10 7 10 3c0-2 1.4-3 2.75-3S15.5 1 15.5 3Zm-1.25 6v12" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    records:
      '<path d="M7 20V10l5-6 5 6v10H7Zm0 0h10" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linejoin="round"/>',
    settings:
      '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5.9 1.6-1.8 3.1-1.8.3c-.3.5-.7.9-1.1 1.2l-.3 1.8-3.2.1-1.6-2.4c-.6 0-1.1-.1-1.6-.3L7.1 18l-1.8-3.1.9-1.6c0-.3 0-.6 0-.9l-.9-1.6 1.8-3.1 1.8-.3c.3-.5.7-.9 1.1-1.2l.3-1.8 3.2-.1 1.6 2.4c.6 0 1.1.1 1.6.3L16.9 6l1.8 3.1-.9 1.6c0 .3 0 .6 0 .9Z" stroke="currentColor" fill="none" stroke-width="1.4"/>',
  };
  return `<svg viewBox="0 0 24 24">${paths[name]}</svg>`;
}

function ringSvg(pct: number, color: string): string {
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = `${c * Math.max(0, pct)} ${c}`;
  const arc =
    pct > 0
      ? `<circle cx="28" cy="28" r="${r}" fill="none" stroke="${color}" stroke-width="6"
      stroke-linecap="round" stroke-dasharray="${dash}" transform="rotate(-90 28 28)"/>`
      : "";
  return `<svg class="svg" viewBox="0 0 56 56">
    <circle cx="28" cy="28" r="${r}" fill="none" stroke="#27272a" stroke-width="6"/>
    ${arc}
  </svg>`;
}

function heatmapHtml(state: AppState): string {
  const cells = heatmap(state, 371);
  const first = cells[0]?.date ?? todayISO();
  const pad = (parseISO(first).getDay() + 6) % 7;
  const extras = Array.from({ length: pad }, (_, i) => `<div class="cell" style="opacity:.2" data-empty="${i}"></div>`).join("");
  const grid = cells
    .map((c) => {
      const cls = c.score ? `s${c.score}` : "";
      const today = isToday(c.date) ? "today" : "";
      return `<div class="cell ${cls} ${today}" data-act="goto" data-date="${c.date}" title="${c.date}"></div>`;
    })
    .join("");
  return extras + grid;
}

function calendarHtml(date: string, hitOn: (iso: string) => boolean): string {
  const d = parseISO(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const title = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const cells: string[] = [];
  for (const dow of ["M", "T", "W", "T", "F", "S", "S"]) cells.push(`<div class="dow">${dow}</div>`);
  for (let i = 0; i < startPad; i++) cells.push(`<button class="mute" disabled></button>`);
  for (let day = 1; day <= days; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const on = iso === date ? "on" : "";
    const hit = hitOn(iso) ? "hit" : "";
    cells.push(`<button class="${on} ${hit}" data-act="goto" data-date="${iso}">${day}</button>`);
  }
  return `<div class="cal">
    <button class="cal-backdrop" data-act="close-cal" aria-label="Close calendar"></button>
    <div class="cal-sheet">
      <div class="topbar">
        <button class="icon-btn" data-act="cal-month" data-n="-1">‹</button>
        <b>${title}</b>
        <button class="icon-btn" data-act="cal-month" data-n="1">›</button>
      </div>
      <div class="cal-grid">${cells.join("")}</div>
      <button class="ghost" style="width:100%;margin-top:12px" data-act="goto" data-date="${todayISO()}">Jump to today</button>
    </div>
  </div>`;
}

export function renderApp(state: AppState, ui: Ui, prs: PR[]): string {
  const day = state.logs[ui.date] ?? blankDay(ui.date);
  const streak = currentStreak(state);
  const body =
    ui.tab === "today"
      ? todayView(state, ui, day, streak)
      : ui.tab === "camp"
        ? renderCampDashboard(ui)
        : ui.tab === "diet"
          ? renderDietDashboard(ui)
          : ui.tab === "stats"
            ? statsView()
            : ui.tab === "records"
              ? recordsView(prs)
              : settingsView(state);

  const hitOn = (iso: string) => (ui.calFor === "diet" ? !!getDietState().days[iso] : !!state.logs[iso]);

  return `<div class="app-shell">
    ${body}
  </div>
  <nav class="nav">
    ${(["today", "camp", "diet", "stats", "records", "settings"] as Tab[])
      .map(
        (t) =>
          `<button class="${ui.tab === t ? "active" : ""}" data-act="tab" data-tab="${t}">${icon(t)}${t}</button>`,
      )
      .join("")}
  </nav>
  ${ui.calendar ? calendarHtml(ui.calFor === "diet" ? ui.dietDate : ui.date, hitOn) : ""}`;
}

function todayView(state: AppState, ui: Ui, day: DayLog, streak: number): string {
  const g = state.goals;
  const runsWeek = runsThisWeek(state, ui.date);
  const rings = [
    ...EXERCISES.map((ex) => ({
      key: ex.key,
      label: ex.short,
      value: day[ex.key].reps,
      goal: g[ex.key],
      color: COLORS[ex.key],
    })),
    { key: "anki", label: "Anki", value: day.anki, goal: g.anki, color: COLORS.anki },
    {
      key: "salah",
      label: "Salah",
      value: prayerCount(day.prayers),
      goal: PRAYERS.length,
      color: COLORS.prayer,
    },
  ];

  return `
    <div class="topbar">
      <div class="brand">
        <b>Pulse</b>
        <span>Train. Pray. Study. Keep the chain.</span>
      </div>
      <div class="streak">
        <span class="flame">🔥</span>
        <div>
          <strong>${streak}</strong>
          <em>day streak</em>
        </div>
      </div>
    </div>

    <div class="date-nav">
      <button class="icon-btn" data-act="shift" data-n="-1" aria-label="Previous day">‹</button>
      <button class="when" data-act="open-cal">
        <b>${formatPrettyDate(ui.date)}</b>
        <span>${isToday(ui.date) ? "Today" : ui.date}</span>
      </button>
      <button class="icon-btn" data-act="shift" data-n="1" aria-label="Next day">›</button>
    </div>

    <div class="rings">
      ${rings
        .map((r) => {
          const pct = ringProgress(r.value, r.goal);
          return `<div class="ring-card ${pct >= 1 ? "done" : ""}">
            ${ringSvg(pct, r.color)}
            <div class="n">${r.value}<span class="unit">/${r.goal}</span></div>
            <div class="k">${r.label}</div>
          </div>`;
        })
        .join("")}
    </div>

    <div class="heatmap-wrap">
      <div class="heatmap-head">
        <h2>Activity</h2>
        <span>${Object.keys(state.logs).length} days logged</span>
      </div>
      <div class="heatmap-scroll">
        <div class="heatmap">${heatmapHtml(state)}</div>
      </div>
    </div>

    ${EXERCISES.map((ex) => exerciseCard(ex.label, ex.key, day[ex.key], g[ex.key], COLORS[ex.key])).join("")}

    ${prayerCard(day)}

    <section class="card">
      <h3>Anki / Master 1 <span>${day.anki} / ${g.anki} cards</span></h3>
      <div class="progress"><i style="width:${ringProgress(day.anki, g.anki) * 100}%;background:${COLORS.anki}"></i></div>
      <div class="metric-row">
        <div class="big">${day.anki}<span class="unit"> cards</span></div>
        <div class="stepper">
          <button class="step" data-act="anki" data-n="-1">−</button>
          <input class="num" inputmode="numeric" data-act="anki-input" value="${day.anki}" />
          <button class="step" data-act="anki" data-n="1">+</button>
        </div>
      </div>
      <div class="quick">
        <button data-act="anki" data-n="10">+10</button>
        <button data-act="anki" data-n="25">+25</button>
        <button data-act="anki" data-n="50">+50</button>
        <button data-act="anki" data-n="100">+100</button>
      </div>
    </section>

    <section class="card">
      <h3>
        Running
        <span class="run-week">${Array.from({ length: g.weeklyRuns }, (_, i) => `<i class="dot ${i < runsWeek ? "on" : ""}"></i>`).join("")} ${runsWeek}/${g.weeklyRuns} this week</span>
      </h3>
      <div class="run-form">
        <div class="field-row">
          <div class="field">
            <label>Distance (km)</label>
            <input class="num" style="width:100%" inputmode="decimal" data-run="km" value="5" />
          </div>
          <div class="field">
            <label>Pace</label>
            <div class="num" style="width:100%;display:grid;place-items:center;font-size:14px" data-run-pace>—</div>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Minutes</label>
            <input class="num" style="width:100%" inputmode="numeric" data-run="min" value="25" />
          </div>
          <div class="field">
            <label>Seconds</label>
            <input class="num" style="width:100%" inputmode="numeric" data-run="sec" value="0" />
          </div>
        </div>
        <div class="quick">
          <button data-act="preset-km" data-n="5">5 km</button>
          <button data-act="preset-km" data-n="3">3 km</button>
          <button data-act="preset-km" data-n="8">8 km</button>
          <button data-act="preset-km" data-n="10">10 km</button>
        </div>
        <div class="field">
          <label>How it felt</label>
          <textarea data-run="notes" placeholder="Easy, heavy legs, cold rain…"></textarea>
        </div>
        <button class="primary" data-act="add-run">Log run</button>
      </div>
      <div class="run-list">
        ${
          day.runs.length
            ? day.runs
                .map(
                  (r) => `<div class="run-item">
                    <div class="row">
                      <b>${r.distanceKm} km · ${formatDuration(r.durationSec)}</b>
                      <button class="ghost" data-act="del-run" data-id="${r.id}">Delete</button>
                    </div>
                    <span>${formatPace(r.distanceKm, r.durationSec)}</span>
                    ${r.notes ? `<p>${escapeHtml(r.notes)}</p>` : ""}
                  </div>`,
                )
                .join("")
            : `<p class="hint">No run logged for this day.</p>`
        }
      </div>
    </section>
  `;
}

function prayerCard(day: DayLog): string {
  const done = prayerCount(day.prayers);
  const pct = ringProgress(done, PRAYERS.length);
  return `<section class="card" data-card="salah">
    <h3>Salah <span>${done} / ${PRAYERS.length}</span></h3>
    <div class="progress"><i style="width:${pct * 100}%;background:${COLORS.prayer}"></i></div>
    <div class="prayers">
      ${PRAYERS.map((p) => {
        const on = day.prayers[p.key];
        return `<button class="prayer ${on ? "on" : ""}" data-act="prayer" data-prayer="${p.key}" aria-pressed="${on}">
          <span class="mark">${on ? "✓" : "○"}</span>
          <span>${p.short}</span>
        </button>`;
      }).join("")}
    </div>
  </section>`;
}

function exerciseCard(
  label: string,
  key: string,
  block: { reps: number; sets: number },
  goal: number,
  color: string,
): string {
  const pct = ringProgress(block.reps, goal);
  return `<section class="card" data-card="${key}">
    <h3>${label} <span>${block.reps} / ${goal} reps</span></h3>
    <div class="progress"><i style="width:${pct * 100}%;background:${color}"></i></div>
    <div class="metric-row">
      <div class="big">${block.reps}<span class="unit"> reps</span></div>
      <div class="stepper">
        <button class="step" data-act="reps" data-ex="${key}" data-n="-1">−</button>
        <input class="num" inputmode="numeric" data-act="reps-input" data-ex="${key}" value="${block.reps}" />
        <button class="step" data-act="reps" data-ex="${key}" data-n="1">+</button>
      </div>
    </div>
    <div class="quick">
      <button data-act="reps" data-ex="${key}" data-n="5">+5</button>
      <button data-act="reps" data-ex="${key}" data-n="10">+10</button>
      <button data-act="reps" data-ex="${key}" data-n="25">+25</button>
      <button data-act="reps" data-ex="${key}" data-n="50">+50</button>
    </div>
    <div class="sets">
      <span>Sets</span>
      <div class="stepper">
        <button class="step" style="width:40px;height:40px" data-act="sets" data-ex="${key}" data-n="-1">−</button>
        <b>${block.sets}</b>
        <button class="step" style="width:40px;height:40px" data-act="sets" data-ex="${key}" data-n="1">+</button>
      </div>
    </div>
  </section>`;
}

function statsView(): string {
  return `
    <div class="topbar">
      <div class="brand"><b>Analytics</b><span>Volume, pace, and 5K progression</span></div>
      <div class="seg">
        <button data-act="range" data-range="week">7D</button>
        <button data-act="range" data-range="month">30D</button>
      </div>
    </div>
    <div class="charts">
      <section class="card chart-card">
        <h3>5K time <span>gold = new PR</span></h3>
        <canvas id="chart-5k"></canvas>
      </section>
      <section class="card chart-card">
        <h3>Average pace</h3>
        <canvas id="chart-pace"></canvas>
      </section>
      <section class="card chart-card">
        <h3>Push-ups</h3>
        <canvas id="chart-pushups"></canvas>
      </section>
      <section class="card chart-card">
        <h3>Pull-ups</h3>
        <canvas id="chart-pullups"></canvas>
      </section>
      <section class="card chart-card">
        <h3>Dips</h3>
        <canvas id="chart-dips"></canvas>
      </section>
      <section class="card chart-card">
        <h3>Squats</h3>
        <canvas id="chart-squats"></canvas>
      </section>
      <section class="card chart-card">
        <h3>Anki cards</h3>
        <canvas id="chart-anki"></canvas>
      </section>
    </div>
  `;
}

function recordsView(prs: PR[]): string {
  return `
    <div class="topbar">
      <div class="brand"><b>Personal records</b><span>All-time bests, highlighted automatically</span></div>
    </div>
    <div class="pr-grid">
      ${prs
        .map(
          (p) => `<article class="pr">
            <div class="badge">★ ${p.sub}</div>
            <small>${p.label}</small>
            <b>${p.value}</b>
            <small>${p.date ? formatMonthDay(p.date) : "Log to unlock"}</small>
          </article>`,
        )
        .join("")}
    </div>
  `;
}

function settingsView(state: AppState): string {
  const g = state.goals;
  return `
    <div class="topbar">
      <div class="brand"><b>Settings</b><span>Local-only. Export before you switch devices.</span></div>
    </div>
    <section class="card settings">
      <h3>Daily goals</h3>
      <div class="goal-grid">
        <div><label>Push-ups</label><input class="num" style="width:100%" data-goal="pushups" value="${g.pushups}" inputmode="numeric" /></div>
        <div><label>Pull-ups</label><input class="num" style="width:100%" data-goal="pullups" value="${g.pullups}" inputmode="numeric" /></div>
        <div><label>Dips</label><input class="num" style="width:100%" data-goal="dips" value="${g.dips}" inputmode="numeric" /></div>
        <div><label>Squats</label><input class="num" style="width:100%" data-goal="squats" value="${g.squats}" inputmode="numeric" /></div>
        <div><label>Anki cards</label><input class="num" style="width:100%" data-goal="anki" value="${g.anki}" inputmode="numeric" /></div>
        <div><label>Runs / week</label><input class="num" style="width:100%" data-goal="weeklyRuns" value="${g.weeklyRuns}" inputmode="numeric" /></div>
      </div>
      <button class="primary" style="width:100%;margin-top:14px" data-act="save-goals">Save goals</button>
    </section>
    <section class="card">
      <h3>Backup</h3>
      <p class="hint">Today, camp, and diet all live in this browser. Export JSON on your Mac, then import on iPhone — or the other way around.</p>
      <div class="quick" style="margin-top:12px;grid-template-columns:1fr 1fr">
        <button data-act="export">Export JSON</button>
        <button data-act="import">Import JSON</button>
      </div>
      <input id="import-file" type="file" accept="application/json" hidden />
    </section>
    <section class="card">
      <h3>Install on iPhone</h3>
      <p class="hint">Open this URL in Safari → Share → Add to Home Screen. On your Mac, use the same Wi‑Fi address shown while <code>npm run dev</code> is running, or serve the production build over HTTPS.</p>
    </section>
    <section class="card">
      <h3>Danger zone</h3>
      <button class="ghost danger" style="width:100%" data-act="reset">Clear all local data</button>
    </section>
  `;
}

export function paintCharts(state: AppState, range: Range): void {
  const fivek = runSeries(state).filter((r) => r.fivek);
  let best = Infinity;
  const fivekPts = fivek.map((r) => {
    const mark = r.durationSec < best;
    if (r.durationSec < best) best = r.durationSec;
    return { label: r.date, value: r.durationSec, mark };
  });
  const pacePts = runSeries(state).map((r, i, arr) => {
    const prev = arr.slice(0, i).reduce((m, x) => Math.min(m, x.pace), Infinity);
    return { label: r.date, value: r.pace, mark: r.pace < prev };
  });

  const c5 = document.getElementById("chart-5k") as HTMLCanvasElement | null;
  const cp = document.getElementById("chart-pace") as HTMLCanvasElement | null;
  if (c5) drawLine(c5, fivekPts, "#22c55e", formatDuration);
  if (cp) drawLine(cp, pacePts, "#38bdf8", formatDuration);

  const map = [
    ["chart-pushups", "pushups", COLORS.pushups],
    ["chart-pullups", "pullups", COLORS.pullups],
    ["chart-dips", "dips", COLORS.dips],
    ["chart-squats", "squats", COLORS.squats],
    ["chart-anki", "anki", COLORS.anki],
  ] as const;
  for (const [id, key, color] of map) {
    const el = document.getElementById(id) as HTMLCanvasElement | null;
    if (!el) continue;
    drawBars(el, volumeSeries(state, key, range), color);
  }

  document.querySelectorAll("[data-range]").forEach((btn) => {
    btn.classList.toggle("on", btn.getAttribute("data-range") === range);
  });
}

export function scrollHeatmap(): void {
  const scroller = document.querySelector(".heatmap-scroll");
  if (scroller) scroller.scrollLeft = scroller.scrollWidth;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export { addDays };
