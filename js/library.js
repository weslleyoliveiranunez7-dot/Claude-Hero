// Telas "Importar MP3" e "Minha biblioteca".
import { go, back, toast } from './router.js';
import { get } from './storage.js';
import { DIFFS } from './songs.js';
import { analyzeFile } from './mp3-analyzer.js';
import { detectBeats } from './beat-detector.js';
import { generateCharts } from './note-generator.js';
import { putSong, listSongs, delSong } from './db.js';
import { unlock } from './audio-engine.js';

const fmt = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const confLabel = c => c >= 0.6 ? 'alta' : c >= 0.35 ? 'média' : 'baixa';
const head = (el, title) => { el.innerHTML = `<div class="screen"><div class="topbar"><button class="btn ghost" id="bk" aria-label="Voltar">←</button><h2>${title}</h2></div><div id="body"></div></div>`; el.querySelector('#bk').onclick = back; return el.querySelector('#body'); };

export function importScreen(el) {
  const body = head(el, 'Importar MP3'); let pending = null, busy = false;
  const pick = () => {
    pending = null;
    body.innerHTML = `<div class="card"><p>Escolha uma música do seu celular (MP3, M4A, WAV ou OGG). O app detecta o ritmo e cria as fases sozinho.</p>
      <p class="muted" style="margin:8px 0 12px">O arquivo fica salvo só neste aparelho. Use músicas que você tem direito de usar.</p>
      <label class="btn" for="file" style="width:100%">📂 Escolher arquivo</label>
      <input id="file" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" hidden></div><div id="st"></div>`;
    body.querySelector('#file').onchange = e => { const f = e.target.files[0]; if (f) run(f); };
  };
  async function run(file) {
    if (busy) return; busy = true;
    body.innerHTML = `<div class="card"><h3 id="msg">Preparando…</h3><div class="pbar"><i id="pb"></i></div><p class="muted" style="margin-top:8px">${esc(file.name)}</p></div>`;
    const set = (p, m) => { const b = body.querySelector('#pb'), t = body.querySelector('#msg'); if (b) b.style.width = Math.round(p * 100) + '%'; if (t) t.textContent = m; };
    try {
      const an = await analyzeFile(file, set);
      set(0.88, 'Detectando as batidas…'); await new Promise(r => setTimeout(r, 20));
      const beats = detectBeats(an);
      if (beats.onsets.length < 20) throw new Error('Não encontrei batidas suficientes nesta música para criar as fases.');
      set(0.95, 'Criando as notas…'); await new Promise(r => setTimeout(r, 20));
      const charts = generateCharts(an, beats);
      pending = { an, beats, charts, name: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Minha música' };
      review();
    } catch (e) {
      body.innerHTML = `<div class="card"><h3>Não deu certo</h3><p class="muted" style="margin:8px 0">${esc(e.message || e)}</p></div><button class="btn" style="width:100%" id="again">Tentar outro arquivo</button>`;
      body.querySelector('#again').onclick = pick;
    } finally { busy = false; }
  }
  function review() {
    const { an, beats, charts } = pending;
    body.innerHTML = `<div class="card"><h3>Música analisada ✅</h3>
      <div class="row"><span>Nome</span><input id="nm" class="txt" value="${esc(pending.name)}" maxlength="40"></div>
      <div class="row"><span>Duração</span><b>${fmt(an.duration)}</b></div>
      <div class="row"><span>BPM detectado</span><b>${beats.bpm}</b></div>
      <div class="row"><span>Confiança do ritmo</span><b>${confLabel(beats.conf)} (${Math.round(beats.conf * 100)}%)</b></div>
      <div class="row"><span>Notas</span><span class="muted">${Object.keys(DIFFS).map(d => DIFFS[d].name + ' ' + charts[d].length).join(' · ')}</span></div>
      ${beats.conf < 0.35 ? '<p class="muted" style="margin-top:8px">Ritmo pouco regular: as notas seguem os golpes do som, sem grade fixa.</p>' : ''}</div>
      <button class="btn" style="width:100%;margin-bottom:10px" id="sg">▶ Salvar e jogar</button>
      <button class="btn ghost" style="width:100%;margin-bottom:10px" id="sv">Salvar na biblioteca</button>
      <button class="btn ghost" style="width:100%" id="ds">Descartar</button>`;
    const save = async () => {
      const id = 'u-' + Date.now().toString(36), name = body.querySelector('#nm').value.trim() || pending.name;
      const meta = { id, name, bpm: beats.bpm, conf: beats.conf, offset: beats.offset, duration: an.duration, created: Date.now(), charts, counts: Object.fromEntries(Object.entries(charts).map(([k, v]) => [k, v.length])) };
      try { await putSong(meta, an.data); } catch (e) { toast('Não consegui salvar: ' + (e.message || e), 4000); return null; }
      return id;
    };
    body.querySelector('#sv').onclick = async () => { if (await save()) { toast('Música salva!'); go('biblioteca'); } };
    body.querySelector('#sg').onclick = async () => { const id = await save(); if (id) { unlock().catch(() => {}); go(`play?s=${id}&d=${get().settings.difficulty}`); } };
    body.querySelector('#ds').onclick = pick;
  }
  pick();
}

export function libraryScreen(el) {
  const body = head(el, 'Minha biblioteca'); let diff = get().settings.difficulty;
  async function draw() {
    let list; try { list = await listSongs(); } catch (e) { body.innerHTML = `<div class="card"><p class="muted">${esc(e.message || e)}</p></div>`; return; }
    const recs = get().records;
    body.innerHTML = `<button class="btn" style="width:100%;margin-bottom:12px" id="imp">📥 Importar música</button>
      <div class="chips">${Object.entries(DIFFS).map(([k, v]) => `<button class="chip ${k === diff ? 'on' : ''}" data-d="${k}">${v.name}</button>`).join('')}</div>
      ${list.length ? list.map(s => { const r = recs[s.id + ':' + diff]; return `<div class="card song"><div class="sn"><b>${esc(s.name)}</b>
        <span class="muted">${s.bpm} BPM · ${fmt(s.duration)} · ${s.counts ? s.counts[diff] : s.charts[diff].length} notas</span>
        <span class="rec">${r ? '⭐'.repeat(r.stars) + ' ' + r.score.toLocaleString('pt-BR') + ' pts' : 'Sem recorde'}</span></div>
        <button class="btn ghost" data-x="${s.id}" aria-label="Apagar" style="min-width:48px">🗑</button><button class="btn" data-p="${s.id}" aria-label="Tocar">▶</button></div>`; }).join('')
        : '<div class="card"><p class="muted">Nenhuma música importada ainda. Toque em “Importar música”.</p></div>'}`;
    body.querySelector('#imp').onclick = () => go('importar');
    body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { diff = b.dataset.d; draw(); });
    body.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { unlock().catch(() => {}); go(`play?s=${b.dataset.p}&d=${diff}`); });
    body.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => { if (confirm('Apagar esta música da biblioteca?')) { await delSong(b.dataset.x); toast('Música apagada'); draw(); } });
  }
  draw();
}
