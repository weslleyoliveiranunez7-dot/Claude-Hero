// Gera os mapas (4 dificuldades) a partir dos picos detectados: força, espaçamento mínimo, grade do BPM,
// pista pelo timbre (centroide), notas longas onde a energia se sustenta e acordes no Expert.
const CFG = {
  facil:   { gap: 0.55, pct: 0.35, lanes: 3, grid: 2 },
  medio:   { gap: 0.32, pct: 0.55, lanes: 4, grid: 2 },
  dificil: { gap: 0.19, pct: 0.80, lanes: 5, grid: 4 },
  expert:  { gap: 0.13, pct: 0.95, lanes: 5, grid: 4, chord: 0.12 }
};
const quant = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)))] || 0; };
export function generateCharts(an, beats) {
  const on = beats.onsets, out = {};
  if (!on.length) return { facil: [], medio: [], dificil: [], expert: [] };
  const cents = on.map(o => o.c), snap = beats.conf >= 0.35;
  for (const [d, cfg] of Object.entries(CFG)) {
    const thr = quant(on.map(o => o.s), 1 - cfg.pct), cand = on.filter(o => o.s >= thr && o.t > 0.4).sort((a, b) => b.s - a.s);
    const buckets = new Map(), acc = [];
    for (const o of cand) {
      const b = Math.floor(o.t / cfg.gap); let ok = true;
      for (let k = b - 1; k <= b + 1 && ok; k++) for (const t of buckets.get(k) || []) if (Math.abs(t - o.t) < cfg.gap) { ok = false; break; }
      if (!ok) continue; if (!buckets.has(b)) buckets.set(b, []); buckets.get(b).push(o.t); acc.push({ ...o });
    }
    acc.sort((a, b) => a.t - b.t);
    if (snap) {
      const step = 60 / beats.bpm / cfg.grid;
      for (const o of acc) { const q = Math.round((o.t - beats.offset) / step) * step + beats.offset; if (Math.abs(q - o.t) <= step * 0.45) o.t = q; }
    }
    const notes = [], cuts = Array.from({ length: cfg.lanes - 1 }, (_, k) => quant(cents, (k + 1) / cfg.lanes));
    const laneOf = c => { let l = 0; while (l < cuts.length && c > cuts[l]) l++; return l; };
    const off5 = cfg.lanes === 4 ? 0 : 0; let l1 = -1, l2 = -1;
    for (const o of acc) {
      const last = notes[notes.length - 1];
      if (last && o.t - last.t < cfg.gap * 0.6) continue;
      let lane = laneOf(o.c) + off5; if (lane === l1 && lane === l2) lane = (lane + 1) % cfg.lanes;
      l2 = l1; l1 = lane; notes.push({ t: Math.round(o.t * 1000) / 1000, lane, len: 0, s: o.s, i: o.i });
    }
    // notas longas
    for (let k = 0; k < notes.length; k++) {
      const n = notes[k], next = k + 1 < notes.length ? notes[k + 1].t : an.duration, gap = next - n.t;
      if (gap < 0.7) continue;
      const i0 = Math.round((n.t - an.t0) / an.hop), i1 = Math.round((n.t + 0.6 * gap - an.t0) / an.hop);
      if (i1 >= an.frames) continue;
      const e0 = Math.max(an.energy[i0], an.energy[i0 + 1] || 0, an.energy[i0 + 2] || 0);
      if (an.energy[i1] >= 0.5 * e0 && e0 > 0.01) n.len = Math.round(Math.min(gap * 0.75, 3) * 1000) / 1000;
    }
    // acordes no Expert
    let res = notes;
    if (cfg.chord) {
      const ts = quant(notes.map(n => n.s), 1 - cfg.chord), extra = [];
      for (const n of notes) if (n.s >= ts) extra.push({ t: n.t, lane: (n.lane + 2) % 5, len: n.len, s: n.s });
      res = notes.concat(extra).sort((a, b) => a.t - b.t || a.lane - b.lane);
    }
    out[d] = res.map(n => ({ t: n.t, lane: n.lane, len: n.len }));
  }
  return out;
}
