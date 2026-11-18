// Tela de jogo: canvas com 5 pistas em perspectiva, notas curtas/longas/acordes, combo, multiplicador,
// energia, julgamento (Perfeito/Ótimo/Bom/Perdeu), pausa, toque + teclado. Sincroniza pelo relógio do áudio.
import { get, save } from './storage.js';
import { go, toast } from './router.js';
import { SONGS, DIFFS, buildChart } from './songs.js';
import { unlock, startSong, LEAD_IN } from './audio-engine.js';

export const session = { last: null };
export const LANE_COLORS = ['#2ee66b', '#ff3d4d', '#ffd93d', '#3d8bff', '#ff9a2e'];
const KEYS = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3, KeyG: 4, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 };
const WIN = { perfect: 0.05, great: 0.095, good: 0.15 };
const NAMES = ['PERFEITO', 'ÓTIMO', 'BOM'], POPC = ['#ffe35a', '#6dffa0', '#8fb8ff'];

export function playScreen(app) {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const song = SONGS.find(s => s.id === q.get('s'));
  let diff = q.get('d'); if (!DIFFS[diff]) diff = get().settings.difficulty;
  if (!song) { go('jogar'); return null; }
  const D = DIFFS[diff], settings = get().settings, beat = 60 / song.bpm;
  const bg = document.getElementById('bg'); if (bg) bg.style.visibility = 'hidden';
  app.innerHTML = `<div class="game"><canvas id="gc"></canvas><button class="pause-btn" id="pz" aria-label="Pausar" hidden>❚❚</button><div class="ov" id="ov"></div></div>`;
  const cv = app.querySelector('#gc'), c2 = cv.getContext('2d'), ov = app.querySelector('#ov'), pz = app.querySelector('#pz');
  let W = 0, H = 0, dpr = 1, mx = 0, hz = 0, hitY = 0, botW = 0, topW = 0;
  let raf = 0, alive = true, running = false, paused = false, ended = false, ctl = null, last = performance.now();
  let notes = [], head = 0, vstart = 0, endAt = 5, S = null, pop = null;
  const pressed = [false, false, false, false, false], flash = [0, 0, 0, 0, 0], holds = [], parts = [], ptrs = new Map();

  const now = () => (ctl ? ctl.time() : -LEAD_IN) - settings.latencyMs / 1000;
  const yOf = d => { const p = Math.max(0, 1 - d / D.approach); return hz + (hitY - hz) * Math.pow(p, 1.8); };
  const wAt = y => topW + (botW - topW) * ((y - hz) / (H - hz));
  const lx = (l, y) => mx + (l - 2) * wAt(y) / 5;
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    mx = W / 2; hz = H * 0.14; hitY = H * 0.8; botW = Math.min(W * 0.98, 640); topW = botW * 0.27;
  }
  function reset() {
    notes = buildChart(song, diff).map(n => ({ ...n, st: 0, hold: false, broken: false }));
    head = 0; vstart = 0; holds.length = 0; parts.length = 0; pop = null;
    S = { score: 0, combo: 0, max: 0, mult: 1, energy: 60, p: 0, g: 0, o: 0, hit: 0 };
    endAt = Math.max(...notes.map(n => n.t + n.len)) + 2.5;
  }
  const say = (text, color) => { pop = { text, color, age: 0 }; };
  function burst(l) {
    const x = lx(l, hitY);
    for (let i = 0; i < 9 && parts.length < 90; i++) parts.push({ x, y: hitY, vx: (Math.random() - 0.5) * 220, vy: -60 - Math.random() * 200, life: 0.35 + Math.random() * 0.3, age: 0, c: LANE_COLORS[l] });
  }
  function miss() {
    S.combo = 0; S.mult = 1; S.energy -= diff === 'facil' ? 5 : 8;
    say('PERDEU', '#ff6b6b'); ctl && ctl.mute(true);
  }
  function press(l) {
    if (!running || paused || ended) return;
    pressed[l] = true; flash[l] = 1;
    const t = now(); let best = null, bd = 9;
    for (let i = head; i < notes.length; i++) {
      const n = notes[i]; if (n.t > t + WIN.good) break;
      if (n.lane !== l || n.st !== 0) continue;
      const d = Math.abs(n.t - t); if (d < bd) { bd = d; best = n; }
    }
    if (!best || bd > WIN.good) { S.combo = 0; S.mult = 1; S.energy -= 2; return; } // toque sem nota
    best.st = 1;
    const k = bd <= WIN.perfect ? 0 : bd <= WIN.great ? 1 : 2;
    S.score += [100, 70, 40][k] * S.mult; S.combo++; S.max = Math.max(S.max, S.combo);
    S.mult = Math.min(4, 1 + Math.floor(S.combo / 10)); S.energy = Math.min(100, S.energy + [2.5, 1.8, 1][k]);
    S[['p', 'g', 'o'][k]]++; S.hit++;
    say(NAMES[k], POPC[k]); burst(l); ctl.mute(false);
    if (best.len > 0) { best.hold = true; holds.push(best); }
    if (settings.vibrate) navigator.vibrate && navigator.vibrate(12);
  }
  const release = l => { pressed[l] = false; };
  const laneAt = x => { const w = wAt(hitY) / 5; return Math.max(0, Math.min(4, Math.floor((x - (mx - w * 2.5)) / w))); };

  function update(t, dt) {
    while (head < notes.length && notes[head].st !== 0) head++;
    for (let i = head; i < notes.length && notes[i].t < t - WIN.good; i++) if (notes[i].st === 0) { notes[i].st = 2; miss(); }
    for (let i = holds.length - 1; i >= 0; i--) {
      const n = holds[i], end = n.t + n.len;
      if (t >= end) { n.hold = false; holds.splice(i, 1); S.score += 50 * S.mult; }
      else if (!pressed[n.lane]) { n.hold = false; holds.splice(i, 1); if (t < end - 0.12) { n.broken = true; ctl.mute(true); } }
      else { S.score += 30 * S.mult * dt; S.energy = Math.min(100, S.energy + 3 * dt); }
    }
    if (diff === 'facil') S.energy = Math.max(5, S.energy);
    if (S.energy <= 0) return finish(false);
    if (t > endAt) finish(true);
  }

  function finish(ok) {
    if (ended) return; ended = true; running = false;
    ctl && ctl.stop();
    const total = notes.length, acc = total ? (S.p + S.g * 0.8 + S.o * 0.5) / total : 0;
    const stars = !ok ? 0 : acc >= 0.95 ? 5 : acc >= 0.85 ? 4 : acc >= 0.7 ? 3 : acc >= 0.5 ? 2 : 1;
    const score = Math.round(S.score);
    const xp = ok ? Math.round(total * acc * 0.6 + stars * 20) : Math.round(S.hit * 0.2);
    const coins = ok ? stars * 8 + Math.floor(S.hit / 20) : 0;
    const st = get(), pr = st.progress, key = song.id + ':' + diff, old = st.records[key];
    let isRecord = false;
    if (ok && (!old || score > old.score)) { st.records[key] = { score, acc, stars, combo: S.max }; isRecord = true; }
    pr.plays++; pr.notesHit += S.hit; pr.bestCombo = Math.max(pr.bestCombo, S.max); pr.totalScore += score;
    pr.xp += xp; pr.coins += coins; pr.level = 1 + Math.floor(pr.xp / 300);
    save();
    session.last = { songId: song.id, name: song.name, diff, ok, score, acc, max: S.max, p: S.p, g: S.g, o: S.o, total, m: total - S.hit, stars, xp, coins, isRecord };
    go('resultado');
  }

  // ---------- desenho ----------
  const ell = (x, y, rx, ry) => { c2.beginPath(); c2.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
  function drawNote(n, t) {
    if (n.st === 1 && !n.hold) return;
    const gray = n.st === 2 || n.broken, col = gray ? '#6b6485' : LANE_COLORS[n.lane];
    const y0 = n.hold ? hitY : yOf(n.t - t);
    if (n.len > 0) {
      const y1 = yOf(n.t + n.len - t);
      if (y0 > y1) {
        const w0 = wAt(y0) / 5 * 0.13, w1 = wAt(y1) / 5 * 0.13, x0 = lx(n.lane, y0), x1 = lx(n.lane, y1);
        c2.globalAlpha = n.hold ? 1 : gray ? 0.3 : 0.6; c2.fillStyle = col;
        c2.beginPath(); c2.moveTo(x1 - w1, y1); c2.lineTo(x1 + w1, y1); c2.lineTo(x0 + w0, y0); c2.lineTo(x0 - w0, y0); c2.closePath(); c2.fill();
        c2.globalAlpha = 1;
      }
    }
    if (!n.hold && n.t - t > D.approach) return;
    const x = lx(n.lane, y0), rx = wAt(y0) / 5 * 0.4, ry = rx * 0.55;
    c2.globalAlpha = gray ? 0.45 : 1; ell(x, y0, rx, ry); c2.fillStyle = col; c2.fill();
    c2.lineWidth = 3; c2.strokeStyle = '#0009'; c2.stroke();
    ell(x, y0 - ry * 0.1, rx * 0.5, ry * 0.45); c2.fillStyle = '#ffffff99'; c2.fill(); c2.globalAlpha = 1;
  }
  function draw(t, dt, ts) {
    c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = c2.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1650'); g.addColorStop(0.5, '#170d30'); g.addColorStop(1, '#0e0820');
    c2.fillStyle = g; c2.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const a = Math.sin(ts / 1800 + i * 2) * 0.25, x0 = W * (0.2 + i * 0.3);
      c2.fillStyle = ['#7a3dff22', '#ff7a1a1c', '#3d8bff1c'][i];
      c2.beginPath(); c2.moveTo(x0, 0); c2.lineTo(x0 - W * 0.12 + a * W * 0.3, H * 0.7); c2.lineTo(x0 + W * 0.12 + a * W * 0.3, H * 0.7); c2.closePath(); c2.fill();
    }
    c2.beginPath(); c2.moveTo(mx - topW / 2, hz); c2.lineTo(mx + topW / 2, hz); c2.lineTo(mx + botW / 2, H); c2.lineTo(mx - botW / 2, H); c2.closePath();
    const hg = c2.createLinearGradient(0, hz, 0, H); hg.addColorStop(0, '#1b1040f0'); hg.addColorStop(1, '#2d1a66f0');
    c2.fillStyle = hg; c2.fill(); c2.lineWidth = 2; c2.strokeStyle = '#7a5cff'; c2.stroke();
    c2.lineWidth = 1; c2.strokeStyle = '#ffffff22'; c2.beginPath();
    for (let l = 0; l <= 5; l++) { c2.moveTo(mx + (l - 2.5) * topW / 5, hz); c2.lineTo(mx + (l - 2.5) * botW / 5, H); }
    c2.stroke();
    for (let k = Math.ceil(t / beat); k * beat < t + D.approach; k++) {
      const y = yOf(k * beat - t); if (y <= hz + 1) continue; const w = wAt(y);
      c2.strokeStyle = k % 4 === 0 ? '#ffffff38' : '#ffffff14'; c2.beginPath(); c2.moveTo(mx - w / 2, y); c2.lineTo(mx + w / 2, y); c2.stroke();
    }
    // notas (de longe para perto)
    while (vstart < notes.length && notes[vstart].t + notes[vstart].len < t - 0.45) vstart++;
    let e = vstart; while (e < notes.length && notes[e].t < t + D.approach) e++;
    for (let i = e - 1; i >= vstart; i--) drawNote(notes[i], t);
    // linha e botões
    c2.strokeStyle = '#ffffff55'; c2.lineWidth = 2; c2.beginPath(); c2.moveTo(mx - wAt(hitY) / 2, hitY); c2.lineTo(mx + wAt(hitY) / 2, hitY); c2.stroke();
    const pw = wAt(hitY) / 5;
    for (let l = 0; l < 5; l++) {
      const x = lx(l, hitY), rx = pw * 0.42, ry = rx * 0.6; flash[l] = Math.max(0, flash[l] - dt * 3);
      ell(x, hitY, rx, ry); c2.fillStyle = pressed[l] ? LANE_COLORS[l] : '#1a1033'; c2.fill();
      c2.lineWidth = 4; c2.strokeStyle = LANE_COLORS[l]; c2.stroke();
      if (flash[l] > 0) { const k = 1 + (1 - flash[l]) * 0.7; c2.globalAlpha = flash[l]; ell(x, hitY, rx * k, ry * k); c2.lineWidth = 3; c2.strokeStyle = '#fff'; c2.stroke(); c2.globalAlpha = 1; }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt; if (p.age > p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; c2.globalAlpha = 1 - p.age / p.life; c2.fillStyle = p.c; c2.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    c2.globalAlpha = 1; c2.textAlign = 'center';
    if (S.combo >= 2) { c2.fillStyle = '#ffffffcc'; c2.font = 'bold 46px system-ui,sans-serif'; c2.fillText(S.combo, mx, H * 0.34); c2.font = 'bold 13px system-ui,sans-serif'; c2.fillStyle = '#ffffff88'; c2.fillText('COMBO', mx, H * 0.34 + 20); }
    if (pop) { pop.age += dt; if (pop.age > 0.7) pop = null; else { c2.globalAlpha = 1 - pop.age / 0.7; c2.font = `bold ${22 + Math.max(0, 0.15 - pop.age) * 60}px system-ui,sans-serif`; c2.fillStyle = pop.color; c2.fillText(pop.text, mx, H * 0.55); c2.globalAlpha = 1; } }
    if (running && t < 0) { c2.font = 'bold 90px system-ui,sans-serif'; c2.fillStyle = '#ffd93d'; c2.fillText(Math.ceil(-t / (LEAD_IN / 3)), mx, H * 0.45); }
    // HUD
    const sc = Math.floor(S.score).toLocaleString('pt-BR');
    c2.textAlign = 'left'; c2.fillStyle = '#fff'; c2.font = 'bold 26px system-ui,sans-serif'; c2.fillText(sc, 14, 36);
    const sw = c2.measureText(sc).width;
    c2.fillStyle = '#ffd93d'; c2.font = 'bold 16px system-ui,sans-serif'; c2.fillText('x' + S.mult, 14 + sw + 8, 36);
    const bw = Math.min(190, W * 0.48), en = Math.max(0, Math.min(100, S.energy)) / 100;
    c2.fillStyle = '#ffffff22'; c2.fillRect(14, 48, bw, 10); c2.fillStyle = en > 0.5 ? '#2ee66b' : en > 0.25 ? '#ffd93d' : '#ff3d4d'; c2.fillRect(14, 48, bw * en, 10);
    c2.fillStyle = '#ff7a1a'; c2.fillRect(0, 0, W * Math.max(0, Math.min(1, t / endAt)), 4);
  }
  function frame(ts) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    const t = now(); if (running && !paused && !ended) update(t, dt);
    draw(t, dt, ts);
  }

  // ---------- telas sobrepostas ----------
  function showReady() {
    running = paused = ended = false; ov.hidden = false; pz.hidden = true;
    ov.innerHTML = `<div class="card ovc"><h3>${song.name}</h3><p class="muted">${D.name} · ${song.bpm} BPM · ${notes.length} notas</p>
      <p>Toque na pista quando a nota chegar nos botões. Nas notas longas, segure o dedo.<br><span class="muted">Teclado: A S D F G</span></p>
      <button class="btn" id="st">▶ Começar</button><button class="btn ghost" id="ex">Sair</button></div>`;
    ov.querySelector('#st').onclick = start; ov.querySelector('#ex').onclick = () => go('jogar');
  }
  async function start() {
    const b = ov.querySelector('#st'); b.disabled = true; b.textContent = 'Preparando palco…';
    try { await unlock(); if (!alive) return; ctl = startSong(song, { volume: settings.volume }); }
    catch (e) { toast('Erro de áudio: ' + (e.message || e), 4000); showReady(); return; }
    ov.hidden = true; pz.hidden = false; running = true;
  }
  async function pause() {
    if (!running || paused || ended) return;
    paused = true; pressed.fill(false); ptrs.clear(); await ctl.pause();
    ov.hidden = false; pz.hidden = true;
    ov.innerHTML = `<div class="card ovc"><h3>Pausado</h3><button class="btn" id="rs">▶ Continuar</button><button class="btn ghost" id="rt">↻ Reiniciar</button><button class="btn ghost" id="ex">Sair</button>
      <p class="muted">Som fora de sincronia? Ajuste a latência em Configurações.</p></div>`;
    ov.querySelector('#rs').onclick = async () => { await ctl.resume(); ov.hidden = true; pz.hidden = false; paused = false; };
    ov.querySelector('#rt').onclick = () => { ctl.stop(); ctl = null; reset(); showReady(); };
    ov.querySelector('#ex').onclick = () => go('jogar');
  }
  pz.onclick = pause;

  // ---------- entrada ----------
  cv.addEventListener('pointerdown', e => { e.preventDefault(); if (cv.setPointerCapture) cv.setPointerCapture(e.pointerId); const l = laneAt(e.clientX); ptrs.set(e.pointerId, l); press(l); });
  const up = e => { const l = ptrs.get(e.pointerId); if (l === undefined) return; ptrs.delete(e.pointerId); if (![...ptrs.values()].includes(l)) release(l); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const kd = e => { if (e.repeat) return; if (e.code in KEYS) press(KEYS[e.code]); else if (e.code === 'Escape' || e.code === 'KeyP') pause(); };
  const ku = e => { if (e.code in KEYS) release(KEYS[e.code]); };
  const vis = () => { if (document.hidden) pause(); };
  addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('resize', resize); document.addEventListener('visibilitychange', vis);

  resize(); reset(); showReady(); raf = requestAnimationFrame(frame);
  return {
    cleanup() {
      alive = false; cancelAnimationFrame(raf); if (ctl) ctl.stop();
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis);
      if (bg) bg.style.visibility = '';
    }
  };
}
