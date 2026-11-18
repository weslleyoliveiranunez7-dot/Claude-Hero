// Motor de áudio: sintetiza as músicas de demonstração com Web Audio e fornece o relógio do jogo
// (audioContext.currentTime), assim notas e som ficam sincronizados.
import { leadOf, stepSec } from './songs.js';
export const LEAD_IN = 2.4; // segundos de contagem antes do passo 0
let ctx = null, master = null, noiseBuf = null, drive = null;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function curve(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; }
export function getCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error('Este navegador não suporta Web Audio.');
  ctx = new AC({ latencyHint: 'interactive' });
  const comp = ctx.createDynamicsCompressor();
  master = ctx.createGain(); master.connect(comp); comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  drive = curve(30);
  return ctx;
}
export async function unlock() { const c = getCtx(); if (c.state !== 'running') await c.resume(); return c; }

export function startSong(song, { volume = 0.8 } = {}) {
  const c = getCtx(), spb = stepSec(song), total = song.bars * 16;
  const byStep = new Map();
  for (const e of leadOf(song)) { if (!byStep.has(e.step)) byStep.set(e.step, []); byStep.get(e.step).push(e); }
  const bus = (g, to) => { const n = c.createGain(); n.gain.value = g; n.connect(to); return n; };
  const out = bus(Math.max(0, Math.min(1, volume)), master);
  const leadBus = bus(0.5, out), rhy = bus(0.2, out), bassBus = bus(0.55, out), drums = bus(0.8, out);
  const t0 = c.currentTime + LEAD_IN;

  const noise = (t, dur, hp, peak) => {
    const s = c.createBufferSource(); s.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(drums); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  };
  const kick = t => {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(drums); o.start(t); o.stop(t + 0.3);
  };
  const snare = t => {
    noise(t, 0.18, 1500, 0.5);
    const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = 190;
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(drums); o.start(t); o.stop(t + 0.12);
  };
  const hat = (t, open) => noise(t, open ? 0.2 : 0.05, 7000, 0.22);
  const bass = (t, m, dur) => {
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = mtof(m); f.type = 'lowpass'; f.frequency.value = 520;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7, t + 0.01); g.gain.setTargetAtTime(0, t + dur, 0.05);
    o.connect(f); f.connect(g); g.connect(bassBus); o.start(t); o.stop(t + dur + 0.3);
  };
  const guitar = (t, notes, dur, dest, peak, cutoff) => {
    const mix = c.createGain(), lp = c.createBiquadFilter(), ws = c.createWaveShaper(), g = c.createGain();
    mix.gain.value = 0.4 / notes.length * 2; lp.type = 'lowpass'; lp.frequency.value = cutoff; ws.curve = drive;
    const oscs = notes.map((m, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'square' : 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = i * 5; o.connect(mix); o.start(t); o.stop(t + dur + 0.35); return o; });
    mix.connect(lp); lp.connect(ws); ws.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.setTargetAtTime(peak * 0.65, t + 0.01, 0.2); g.gain.setTargetAtTime(0, t + dur, 0.04);
    return oscs;
  };
  const sched = step => {
    const t = t0 + step * spb, bar = Math.floor(step / 16), s = step % 16, chord = song.prog[bar % song.prog.length];
    for (const e of byStep.get(step) || []) guitar(t, [e.midi], e.len * spb * 0.95, leadBus, 0.6, 2600);
    if (bar === total / 16 - 1) { if (s === 0) { kick(t); guitar(t, [song.root + chord, song.root + chord + 7, song.root + chord + 12], spb * 14, rhy, 0.7, 1800); } return; }
    if (s === 0 || s === 8 || (s === 10 && bar % 2 && bar > 1)) kick(t);
    if (s === 4 || s === 12 || (bar % 8 === 7 && s > 12)) snare(t);
    if (s % 2 === 0) hat(t, s === 14);
    if (bar >= 1 && s % 2 === 0) bass(t, song.root + chord - 12, spb * 1.8);
    if (bar >= 2 && (s === 0 || s === 6 || s === 8 || s === 14)) guitar(t, [song.root + chord, song.root + chord + 7, song.root + chord + 12], spb * (s === 0 ? 5 : 1.6), rhy, 0.5, 1800);
  };
  let next = 0, muted = false, stopped = false;
  const tick = () => { while (next < total && t0 + next * spb < c.currentTime + 0.3) sched(next++); };
  const timer = setInterval(tick, 30); tick();
  return {
    t0, total, spb,
    time: () => c.currentTime - t0,
    mute(on) { if (on === muted) return; muted = on; leadBus.gain.setTargetAtTime(on ? 0.06 : 0.5, c.currentTime, 0.03); },
    pause: () => c.suspend(),
    resume: () => c.resume(),
    stop() {
      if (stopped) return; stopped = true; clearInterval(timer);
      out.gain.setTargetAtTime(0, c.currentTime, 0.08);
      setTimeout(() => { try { out.disconnect(); } catch (e) {} }, 700);
      if (c.state === 'suspended') c.resume().catch(() => {});
    }
  };
}
