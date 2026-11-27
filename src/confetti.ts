type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  r: number;
};

const COLORS = ["#22c55e", "#38bdf8", "#a78bfa", "#f59e0b", "#f97316", "#f43f5e"];

let raf = 0;
const particles: Particle[] = [];

export function burst(x?: number, y?: number): void {
  const canvas = document.getElementById("burst") as HTMLCanvasElement | null;
  if (!canvas) return;
  const cx = x ?? window.innerWidth / 2;
  const cy = y ?? window.innerHeight * 0.28;
  for (let i = 0; i < 42; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 6;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 2,
      life: 1,
      color: COLORS[i % COLORS.length],
      r: 2 + Math.random() * 3,
    });
  }
  if (!raf) loop();
}

function loop(): void {
  const canvas = document.getElementById("burst") as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life -= 0.016;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (particles.length) raf = requestAnimationFrame(loop);
  else {
    raf = 0;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

export function tap(el: Element | null): void {
  if (!el) return;
  el.classList.remove("pop");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("pop");
}

export function vibrate(ms = 12): void {
  navigator.vibrate?.(ms);
}
