// Fundo de palco: refletores, notas flutuantes e partículas. Leve para celulares modestos.
import { get } from './storage.js';
const cv = document.getElementById('bg');
const ctx = cv.getContext('2d');
let W = 0, H = 0, raf = 0, t0 = performance.now();
const COLORS = ['#2ee66b', '#ff3d4d', '#ffd93d', '#3d8bff', '#ff9a2e'];
const parts = Array.from({ length: 22 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: 0.02 + Math.random() * 0.05, c: COLORS[i % 5], g: Math.random() < 0.5 ? '♪' : '♫', z: 12 + Math.random() * 16 }));
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function draw(now) {
  const t = (now - t0) / 1000;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a0e3a'); g.addColorStop(1, '#0a0516');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const ang = Math.sin(t * 0.6 + i * 2) * 0.35;
    const x = W * (0.2 + i * 0.3);
    ctx.save(); ctx.translate(x, -10); ctx.rotate(ang);
    const bg = ctx.createLinearGradient(0, 0, 0, H * 0.9);
    bg.addColorStop(0, COLORS[(i * 2) % 5] + '55'); bg.addColorStop(1, '#0000');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(W * 0.16, H * 0.9); ctx.lineTo(-W * 0.16, H * 0.9); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const p of parts) {
    p.y -= p.s * 0.016; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
    ctx.globalAlpha = 0.35; ctx.fillStyle = p.c; ctx.font = `${p.z}px sans-serif`;
    ctx.fillText(p.g, p.x * W + Math.sin(t + p.x * 9) * 8, p.y * H);
  }
  ctx.globalAlpha = 1;
  raf = requestAnimationFrame(draw);
}
function still() {
  cancelAnimationFrame(raf); raf = 0;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a0e3a'); g.addColorStop(1, '#0a0516');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
export function applyBg() {
  if (get().settings.bg && !document.hidden) { if (!raf) raf = requestAnimationFrame(draw); } else still();
}
export function initBackground() {
  resize(); addEventListener('resize', () => { resize(); applyBg(); });
  addEventListener('ch:bg', applyBg);
  document.addEventListener('visibilitychange', applyBg);
  applyBg();
}
