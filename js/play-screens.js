// Seleção de música e tela de resultados.
import { get } from './storage.js';
import { go, back } from './router.js';
import { SONGS, DIFFS, durationSec } from './songs.js';
import { session } from './gameplay.js';
import { unlock } from './audio-engine.js';
import { listSongs } from './db.js';

let chosen = null;
const fmt = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

export function selectScreen(el) {
  const st = get(); let diff = chosen || st.settings.difficulty;
  const draw = () => {
    el.innerHTML = `<div class="screen"><div class="topbar"><button class="btn ghost" id="bk" aria-label="Voltar">←</button><h2>Jogar uma música</h2></div>
      <div class="chips">${Object.entries(DIFFS).map(([k, v]) => `<button class="chip ${k === diff ? 'on' : ''}" data-d="${k}">${v.name}</button>`).join('')}</div>
      ${SONGS.map(s => { const r = st.records[s.id + ':' + diff]; return `<div class="card song"><div class="sn"><b>${s.name}</b>
        <span class="muted">${s.artist} · ${s.bpm} BPM · ${fmt(durationSec(s))}</span>
        <span class="rec">${r ? '⭐'.repeat(r.stars) + ' ' + r.score.toLocaleString('pt-BR') + ' pts' : 'Sem recorde'}</span></div>
        <button class="btn" data-p="${s.id}" aria-label="Tocar ${s.name}">▶</button></div>`; }).join('')}
      <div id="lib"></div><p class="muted">Músicas de demonstração originais. Para usar a sua, vá em “Importar MP3”.</p></div>`;
    el.querySelector('#bk').onclick = back;
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { diff = chosen = b.dataset.d; draw(); });
    const bind = root => root.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { unlock().catch(() => {}); go(`play?s=${b.dataset.p}&d=${diff}`); });
    bind(el);
    listSongs().then(list => {
      const box = el.querySelector('#lib'); if (!box || !list.length) return;
      box.innerHTML = '<h3 style="margin:6px 0 10px">Minhas músicas</h3>' + list.map(s => { const r = st.records[s.id + ':' + diff]; return `<div class="card song"><div class="sn"><b>${s.name.replace(/[<>&]/g, '')}</b>
        <span class="muted">Importada · ${s.bpm} BPM · ${fmt(s.duration)}</span><span class="rec">${r ? '⭐'.repeat(r.stars) + ' ' + r.score.toLocaleString('pt-BR') + ' pts' : 'Sem recorde'}</span></div>
        <button class="btn" data-p="${s.id}" aria-label="Tocar">▶</button></div>`; }).join('');
      bind(box);
    }).catch(() => {});
  };
  draw();
}

export function resultScreen(el) {
  const r = session.last; if (!r) { go('jogar'); return; }
  const pct = Math.round(r.acc * 100);
  el.innerHTML = `<div class="screen"><div class="card result">
      <h2>${r.ok ? 'Show concluído!' : 'Você perdeu o show'}</h2><p class="muted">${r.name} · ${DIFFS[r.diff].name}</p>
      <div class="stars">${r.ok ? '⭐'.repeat(r.stars) + '☆'.repeat(5 - r.stars) : '☆☆☆☆☆'}</div>
      <div class="big">${r.score.toLocaleString('pt-BR')}</div>${r.isRecord ? '<span class="badge">Novo recorde!</span>' : ''}
      <div class="stat" style="margin-top:12px"><div><b>${pct}%</b>Precisão</div><div><b>${r.max}</b>Maior combo</div>
        <div><b>${r.p}</b>Perfeitos</div><div><b>${r.g}</b>Ótimos</div><div><b>${r.o}</b>Bons</div><div><b>${r.m}</b>Perdidos</div></div>
      <p style="margin-top:12px">+${r.xp} XP · 🪙 +${r.coins}</p></div>
    <button class="btn" style="width:100%;margin-bottom:10px" id="again">↻ Tocar de novo</button>
    <button class="btn ghost" style="width:100%;margin-bottom:10px" id="pick">Escolher música</button>
    <button class="btn ghost" style="width:100%" id="home">Menu</button></div>`;
  el.querySelector('#again').onclick = () => { unlock().catch(() => {}); go(`play?s=${r.songId}&d=${r.diff}`); };
  el.querySelector('#pick').onclick = () => go('jogar');
  el.querySelector('#home').onclick = () => go('home');
}
