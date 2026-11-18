// Detecta batidas (picos de fluxo espectral), BPM (autocorrelação + grade de pente), fase e confiança.
const mean = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / (a.length || 1); };
export function detectBeats(an) {
  const F = an.frames, hop = an.hop, flux = new Float32Array(F);
  const nl = mean(an.low) + 1e-6, nm = mean(an.mid) + 1e-6, nh = mean(an.high) + 1e-6;
  for (let i = 0; i < F; i++) flux[i] = 1.2 * an.low[i] / nl + an.mid[i] / nm + 0.8 * an.high[i] / nh;
  const fm = mean(flux); let sd = 0; for (let i = 0; i < F; i++) sd += (flux[i] - fm) ** 2; sd = Math.sqrt(sd / F) + 1e-6;
  // picos
  const pre = new Float64Array(F + 1); for (let i = 0; i < F; i++) pre[i + 1] = pre[i] + flux[i];
  const w = Math.max(3, Math.round(0.5 / hop)), onsets = [];
  for (let i = 2; i < F - 2; i++) {
    const v = flux[i];
    if (!(v > flux[i - 1] && v >= flux[i + 1] && v > flux[i - 2] && v >= flux[i + 2])) continue;
    const a = Math.max(0, i - w), b = Math.min(F, i + w + 1), lm = (pre[b] - pre[a]) / (b - a);
    if (v > lm + 0.6 * sd) onsets.push({ t: an.t0 + i * hop, i, s: (v - lm) / sd, c: an.centroid[i] });
  }
  // BPM por autocorrelação com preferência por andamentos comuns
  const x = new Float32Array(F); for (let i = 0; i < F; i++) x[i] = Math.max(0, flux[i] - fm);
  const lagMin = Math.max(2, Math.floor(60 / 190 / hop)), lagMax = Math.ceil(60 / 60 / hop), ac = [];
  for (let L = lagMin; L <= lagMax + 1; L++) { let s = 0; for (let i = 0; i + L < F; i++) s += x[i] * x[i + L]; ac[L] = s / (F - L); }
  let bestL = lagMin, bestV = -1;
  for (let L = lagMin + 1; L <= lagMax; L++) {
    if (!(ac[L] >= ac[L - 1] && ac[L] >= ac[L + 1])) continue;
    const bpm = 60 / (L * hop), v = ac[L] * Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.8) ** 2);
    if (v > bestV) { bestV = v; bestL = L; }
  }
  const rough = 60 / (bestL * hop);
  // refina: grade de pente (período x fase) sobre o fluxo
  const at = t => { const p = (t - an.t0) / hop, i = Math.floor(p); if (i < 0 || i >= F - 1) return 0; const f = p - i; return flux[i] * (1 - f) + flux[i + 1] * f; };
  let best = { score: -1, bpm: rough, off: 0 };
  for (let bpm = rough * 0.96; bpm <= rough * 1.04; bpm += 0.1) {
    const P = 60 / bpm;
    for (let k = 0; k < 24; k++) {
      const off = P * k / 24; let s = 0, n = 0;
      for (let t = off; t < an.duration; t += P) { s += at(t) + 0.5 * at(t + P / 2) * 0; n++; }
      s /= n; if (s > best.score) best = { score: s, bpm, off };
    }
  }
  const conf = Math.max(0, Math.min(1, (best.score / (fm + 1e-6) - 1) / 1.5));
  return { bpm: Math.round(best.bpm * 10) / 10, offset: best.off, conf, onsets, flux };
}
