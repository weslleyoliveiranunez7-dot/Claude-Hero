// Lê e decodifica o áudio (MP3/M4A/WAV/OGG) e extrai, por quadro, o fluxo espectral em 3 faixas,
// a energia e o centroide espectral. Processa em partes para não travar a tela.
import { getCtx } from './audio-engine.js';
export const N = 512, HOP = 256, DEC = 4;
const tick = () => new Promise(r => setTimeout(r, 0));

function makeFFT(n) {
  const cos = new Float32Array(n / 2), sin = new Float32Array(n / 2), rev = new Uint32Array(n), bits = Math.log2(n);
  for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos(2 * Math.PI * i / n); sin[i] = Math.sin(2 * Math.PI * i / n); }
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1); rev[i] = r; }
  return (re, im) => {
    for (let i = 0; i < n; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= n; size *= 2) {
      const half = size / 2, step = n / size;
      for (let i = 0; i < n; i += size) for (let j = i, k = 0; j < i + half; j++, k += step) {
        const l = j + half, tr = re[l] * cos[k] + im[l] * sin[k], ti = -re[l] * sin[k] + im[l] * cos[k];
        re[l] = re[j] - tr; im[l] = im[j] - ti; re[j] += tr; im[j] += ti;
      }
    }
  };
}

export async function analyzeFile(file, onProgress = () => {}) {
  if (file.size > 60e6) throw new Error('Arquivo muito grande (máximo 60 MB).');
  onProgress(0.02, 'Lendo o arquivo…');
  const data = await file.arrayBuffer();
  onProgress(0.08, 'Decodificando o áudio…');
  let buf;
  try { buf = await getCtx().decodeAudioData(data.slice(0)); }
  catch (e) { throw new Error('Não consegui ler este arquivo como áudio. Tente um MP3, M4A, WAV ou OGG válido.'); }
  if (buf.duration < 10) throw new Error('Música curta demais (mínimo 10 segundos).');
  if (buf.duration > 720) throw new Error('Música longa demais (máximo 12 minutos).');
  await tick();
  const ch = buf.numberOfChannels, len = Math.floor(buf.length / DEC), sr = buf.sampleRate / DEC, mono = new Float32Array(len);
  for (let c = 0; c < ch; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) { let s = 0; const o = i * DEC; for (let k = 0; k < DEC; k++) s += d[o + k]; mono[i] += s / DEC / ch; }
    await tick();
  }
  let sq = 0; for (let i = 0; i < len; i += 7) sq += mono[i] * mono[i];
  if (Math.sqrt(sq / (len / 7)) < 0.002) throw new Error('Este áudio parece estar em silêncio.');

  const F = Math.floor((len - N) / HOP) + 1, fft = makeFFT(N), win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  const binHz = sr / N, lowEnd = Math.max(2, Math.round(250 / binHz)), midEnd = Math.max(lowEnd + 2, Math.round(1400 / binHz)), top = N / 2;
  const low = new Float32Array(F), mid = new Float32Array(F), high = new Float32Array(F), energy = new Float32Array(F), centroid = new Float32Array(F);
  const re = new Float32Array(N), im = new Float32Array(N), prev = new Float32Array(top), cur = new Float32Array(top);
  for (let f = 0; f < F; f++) {
    const o = f * HOP; let e = 0;
    for (let i = 0; i < N; i++) { const v = mono[o + i]; re[i] = v * win[i]; im[i] = 0; e += v * v; }
    fft(re, im);
    let cs = 0, ms = 0, l = 0, m = 0, h = 0;
    for (let k = 1; k < top; k++) {
      const mag = Math.log(1 + 20 * Math.hypot(re[k], im[k]) / N * 8); cur[k] = mag;
      const d = mag - prev[k], p = d > 0 ? d : 0;
      if (k < lowEnd) l += p; else if (k < midEnd) m += p; else h += p;
      cs += k * mag; ms += mag;
    }
    low[f] = l; mid[f] = m; high[f] = h; energy[f] = Math.sqrt(e / N); centroid[f] = ms > 0 ? cs / ms : 0;
    prev.set(cur);
    if (f % 300 === 0) { onProgress(0.15 + 0.7 * f / F, 'Analisando o som…'); await tick(); }
  }
  return { data, duration: buf.duration, frames: F, hop: HOP / sr, t0: (N / 2) / sr, low, mid, high, energy, centroid };
}
