import { register, start, go, back, toast } from './router.js';
import { get } from './storage.js';
import { renderSettings } from './settings.js';
import { mascotSVG } from './mascot.js';
import { initBackground } from './background.js';

// Itens do menu. "etapa" = em qual etapa do plano a função fica pronta.
const MENU = [
  { id: 'historia',  ic: '📖', tt: 'Modo História',    sub: 'Derrote o SILÊNCIO',       c: '#ff3d4d', etapa: 6 },
  { id: 'jogar',     ic: '🎸', tt: 'Jogar uma música', sub: 'Escolha e toque',          c: '#2ee66b', etapa: 2, main: true },
  { id: 'biblioteca',ic: '📚', tt: 'Minha biblioteca', sub: 'Suas músicas salvas',      c: '#3d8bff', etapa: 3 },
  { id: 'importar',  ic: '📥', tt: 'Importar MP3',     sub: 'Gere fases da sua música', c: '#ffd93d', etapa: 3 },
  { id: 'criar',     ic: '✨', tt: 'Criar música',     sub: 'Monte um mapa do zero',    c: '#ff9a2e', etapa: 4 },
  { id: 'editor',    ic: '🎚️', tt: 'Editor de notas',  sub: 'Ajuste cada nota',         c: '#ff9a2e', etapa: 4 },
  { id: 'guitar',    ic: '📱', tt: 'CLAUDE GUITAR',    sub: 'Controle e afinador',      c: '#3d8bff', etapa: 5 },
  { id: 'treino',    ic: '🎓', tt: 'Treinamento',      sub: 'Aprenda guitarra',         c: '#2ee66b', etapa: 7 },
  { id: 'loja',      ic: '🛒', tt: 'Loja',             sub: 'Gaste suas moedas',        c: '#ffd93d', etapa: 7 },
  { id: 'personagens',ic:'🧑‍🎤', tt: 'Personagens',      sub: 'Escolha seu herói',        c: '#ff3d4d', etapa: 7 },
  { id: 'stats',     ic: '📊', tt: 'Estatísticas',     sub: 'Seu desempenho',           c: '#a99ccf', etapa: 0 },
  { id: 'config',    ic: '⚙️', tt: 'Configurações',    sub: 'Volume e latência',        c: '#a99ccf', etapa: 0 }
];

const SCREENS = { stats: 'Estatísticas', config: 'Configurações' };

function home(el) {
  const p = get().progress;
  el.innerHTML = `<div class="screen home">
    <div class="hero">${mascotSVG()}<div class="logo">CLAUDE<br>HERÓI</div><div class="tag">Rock • Ritmo • Guitarra</div></div>
    <div class="player">Nível <b>${p.level}</b> · XP <b>${p.xp}</b> · 🪙 <b>${p.coins}</b></div>
    <div class="menu-grid">${MENU.map(m => `
      <button class="menu-item ${m.main ? 'main' : ''}" style="--c:${m.c}" data-go="${m.id}">
        ${m.etapa > 1 ? `<span class="lock">Etapa ${m.etapa}</span>` : ''}
        <span class="ic">${m.ic}</span><span class="tt">${m.tt}</span><span class="sub">${m.sub}</span>
      </button>`).join('')}
    </div></div>`;
  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
}

function shell(el, title, bodyFn) {
  el.innerHTML = `<div class="screen"><div class="topbar"><button class="btn ghost" id="bk" aria-label="Voltar">←</button><h2>${title}</h2></div><div id="body"></div></div>`;
  el.querySelector('#bk').onclick = back;
  bodyFn(el.querySelector('#body'));
}

function stats(body) {
  const p = get().progress, recs = Object.keys(get().records).length;
  body.innerHTML = `<div class="card stat">
    <div><b>${p.level}</b>Nível</div><div><b>${p.xp}</b>XP</div>
    <div><b>${p.coins}</b>Moedas</div><div><b>${p.plays}</b>Músicas jogadas</div>
    <div><b>${p.notesHit}</b>Notas acertadas</div><div><b>${p.bestCombo}</b>Maior combo</div>
    <div><b>${p.totalScore}</b>Pontos totais</div><div><b>${recs}</b>Recordes salvos</div></div>
    <p class="muted">Tudo é salvo só neste aparelho. Os números sobem quando você jogar (a partir da Etapa 2).</p>`;
}

function soon(m) {
  return body => {
    body.innerHTML = `<div class="card soon">${mascotSVG()}<span class="badge">Chega na Etapa ${m.etapa}</span>
      <h3 style="margin:10px 0 6px">${m.tt}</h3>
      <p class="muted">Esta função ainda não foi construída. Está no plano para a Etapa ${m.etapa}; nada aqui é simulado.</p></div>
      <button class="btn" style="width:100%" id="h">Voltar ao menu</button>`;
    body.querySelector('#h').onclick = () => go('home');
  };
}

register('home', home);
for (const m of MENU) {
  register(m.id, el => shell(el, m.tt, m.id === 'stats' ? stats : m.id === 'config' ? (b => renderSettings(b)) : soon(m)));
}

initBackground();
start();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW falhou', e));
  }
   
