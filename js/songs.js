// Músicas de demonstração ORIGINAIS, geradas por código (mesma semente = mesma música e mesmo mapa).
export const DIFFS = {
  facil:   { name: 'Fácil',   approach: 2.0 },
  medio:   { name: 'Médio',   approach: 1.8 },
  dificil: { name: 'Difícil', approach: 1.6 },
  expert:  { name: 'Expert',  approach: 1.4 }
};
const SCALES = { pent: [0, 3, 5, 7, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
// Ritmos de um compasso em semicolcheias: [passo, duração]
const TEMPLATES = [
  [[0,4],[4,2],[6,2],[8,4],[12,2],[14,2]],
  [[0,2],[2,2],[4,2],[6,2],[8,2],[10,2],[12,4]],
  [[0,3],[3,3],[6,2],[8,4],[12,4]],
  [[0,2],[4,2],[8,2],[10,1],[11,1],[12,4]],
  [[0,8],[8,2],[10,2],[12,2],[14,2]],
  [[0,1],[1,1],[2,2],[4,4],[8,1],[9,1],[10,2],[12,4]]
];
export const SONGS = [
  { id: 'amanhecer', name: 'Amanhecer Elétrico', artist: 'Claude Herói', bpm: 112, root: 57, scale: 'pent',   prog: [0, -4, -9, -2], bars: 40, seed: 11, density: 0.55 },
  { id: 'neon',      name: 'Estrada de Neon',    artist: 'Claude Herói', bpm: 128, root: 52, scale: 'pent',   prog: [0, -4, -7, -5], bars: 40, seed: 23, density: 0.7 },
  { id: 'silencio',  name: 'Silêncio Quebrado',  artist: 'Claude Herói', bpm: 144, root: 50, scale: 'dorian', prog: [0, 3, -2, 5],   bars: 40, seed: 37, density: 0.85 }
];
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const cache = new Map();
// Melodia principal: [{step, len, idx, midi}] (step = semicolcheia desde o início)
export function leadOf(song) {
  if (cache.has(song.id)) return cache.get(song.id);
  const r = rng(song.seed), sc = SCALES[song.scale], n = sc.length;
  const pool = song.density < 0.6 ? [0, 2, 4, 3] : song.density < 0.8 ? [0, 1, 2, 3, 5] : [1, 3, 5, 1, 5, 0];
  let idx = n;
  const phrase = () => {
    const bars = [];
    for (let b = 0; b < 4; b++) {
      const T = TEMPLATES[pool[Math.floor(r() * pool.length)]], evs = [];
      for (const [st, len] of T) {
        idx += [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)];
        idx = Math.max(2, Math.min(n * 2 - 1, idx));
        evs.push({ st, len, idx });
      }
      bars.push(evs);
    }
    return bars;
  };
  const A = phrase(), B = phrase(), seq = [A, A, B, A], out = [];
  const midi = i => song.root + 12 * Math.floor(i / n) + sc[i % n];
  for (let bar = 1; bar < song.bars - 1; bar++) {
    const ph = seq[Math.floor((bar - 1) / 4) % 4];
    for (const e of ph[(bar - 1) % 4]) out.push({ step: bar * 16 + e.st, len: e.len, idx: e.idx, midi: midi(e.idx) });
  }
  out.push({ step: (song.bars - 1) * 16, len: 16, idx: n, midi: midi(n) });
  cache.set(song.id, out);
  return out;
}
export const stepSec = song => 60 / song.bpm / 4;
export const durationSec = song => song.bars * 16 * stepSec(song);
// Mapa de notas por dificuldade: [{t, lane(0-4), len(s, 0 = nota curta)}] ordenado por tempo
export function buildChart(song, diff) {
  const spb = stepSec(song), out = [];
  for (const e of leadOf(song)) {
    if (diff === 'facil' && e.step % 4) continue;
    if (diff === 'medio' && e.step % 2) continue;
    let lane = e.idx % 5;
    if (diff === 'facil') lane %= 3; else if (diff === 'medio') lane %= 4;
    const len = e.len >= 4 ? e.len * spb : 0, t = e.step * spb;
    out.push({ t, lane, len });
    if (diff === 'expert' && (e.len >= 4 || e.step % 16 === 0)) out.push({ t, lane: (lane + 2) % 5, len });
  }
  out.sort((a, b) => a.t - b.t || a.lane - b.lane);
  for (let i = 0; i < out.length; i++) {
    const n = out[i]; if (!n.len) continue;
    let next = null;
    for (let j = i + 1; j < out.length; j++) if (out[j].lane === n.lane && out[j].t > n.t) { next = out[j]; break; }
    if (next) n.len = Math.min(n.len, next.t - n.t - 0.12);
    n.len = n.len < 0.25 ? 0 : n.len * 0.95;
  }
  return out;
}
