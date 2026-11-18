import { get, save } from './storage.js';
import { toast } from './router.js';
export function renderSettings(el) {
  const s = get().settings;
  el.innerHTML = `
  <div class="card">
    <div class="row"><span>Volume da música</span><input id="vol" type="range" min="0" max="100" value="${Math.round(s.volume * 100)}"></div>
    <div class="row"><span>Ajuste de latência<br><span class="muted">Se as notas parecerem fora do som (<span id="latv">${s.latencyMs}</span> ms)</span></span><input id="lat" type="range" min="-300" max="300" step="5" value="${s.latencyMs}"></div>
    <div class="row"><span>Dificuldade padrão</span>
      <select id="diff">${[['facil','Fácil'],['medio','Médio'],['dificil','Difícil'],['expert','Expert']].map(([v,n]) => `<option value="${v}" ${s.difficulty === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="row"><span>Fundo animado<br><span class="muted">Desligue para poupar bateria</span></span><input id="bgf" class="switch" type="checkbox" ${s.bg ? 'checked' : ''}></div>
    <div class="row"><span>Vibração ao tocar</span><input id="vib" class="switch" type="checkbox" ${s.vibrate ? 'checked' : ''}></div>
  </div>
  <button class="btn ghost" id="resetBtn" style="width:100%">Apagar progresso e recordes</button>`;
  const upd = () => { save(); };
  el.querySelector('#vol').oninput = e => { s.volume = e.target.value / 100; upd(); };
  el.querySelector('#lat').oninput = e => { s.latencyMs = +e.target.value; el.querySelector('#latv').textContent = s.latencyMs; upd(); };
  el.querySelector('#diff').onchange = e => { s.difficulty = e.target.value; upd(); toast('Dificuldade salva'); };
  el.querySelector('#bgf').onchange = e => { s.bg = e.target.checked; upd(); window.dispatchEvent(new Event('ch:bg')); };
  el.querySelector('#vib').onchange = e => { s.vibrate = e.target.checked; upd(); if (s.vibrate) navigator.vibrate?.(30); };
  el.querySelector('#resetBtn').onclick = async () => {
    if (confirm('Apagar todo o progresso e recordes deste aparelho?')) {
      const { reset } = await import('./storage.js'); reset(); toast('Progresso apagado'); renderSettings(el);
    }
  };
}
