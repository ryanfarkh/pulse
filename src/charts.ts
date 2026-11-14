export type SeriesPoint = { label: string; value: number; date?: string; mark?: boolean };

function setup(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

export function drawBars(
  canvas: HTMLCanvasElement,
  series: SeriesPoint[],
  color: string,
): void {
  const g = setup(canvas);
  if (!g) return;
  const { ctx, w, h } = g;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 22;
  const max = Math.max(1, ...series.map((s) => s.value));
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const gap = series.length > 14 ? 2 : 6;
  const bw = Math.max(2, (innerW - gap * (series.length - 1)) / series.length);

  series.forEach((s, i) => {
    const x = padL + i * (bw + gap);
    const bh = (s.value / max) * innerH;
    const y = padT + innerH - bh;
    ctx.fillStyle = s.value > 0 ? color : "rgba(255,255,255,0.06)";
    roundRect(ctx, x, y, bw, Math.max(2, bh), Math.min(4, bw / 2));
    ctx.fill();
    if (series.length <= 14 || i % 5 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.font = "10px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(s.label, x + bw / 2, h - 6);
    }
  });
}

export function drawLine(
  canvas: HTMLCanvasElement,
  series: SeriesPoint[],
  color: string,
  formatter?: (v: number) => string,
): void {
  const g = setup(canvas);
  if (!g) return;
  const { ctx, w, h } = g;
  const padL = 44;
  const padR = 12;
  const padT = 16;
  const padB = 24;
  if (series.length === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "13px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Log runs to see progression", w / 2, h / 2);
    return;
  }
  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = padT + (innerH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.font = "10px ui-sans-serif, system-ui";
  ctx.textAlign = "right";
  ctx.fillText(formatter ? formatter(max) : String(max), padL - 8, padT + 4);
  ctx.fillText(formatter ? formatter(min) : String(min), padL - 8, padT + innerH);

  const pts = series.map((s, i) => {
    const x = padL + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const y = padT + innerH - ((s.value - min) / span) * innerH;
    return { x, y, s };
  });

  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.lineTo(pts[pts.length - 1].x, padT + innerH);
  ctx.lineTo(pts[0].x, padT + innerH);
  ctx.closePath();
  ctx.fillStyle = hexAlpha(color, 0.12);
  ctx.fill();

  pts.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s.mark ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = p.s.mark ? "#fbbf24" : color;
    ctx.fill();
    if (p.s.mark) {
      ctx.strokeStyle = "rgba(251,191,36,0.5)";
      ctx.lineWidth = 6;
      ctx.stroke();
    }
  });
}

function hexAlpha(color: string, a: number): string {
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
