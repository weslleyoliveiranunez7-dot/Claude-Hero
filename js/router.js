// Roteador simples por hash (#/rota). Cada tela é uma função que desenha em #app.
const routes = {};
let current = null;
export function register(path, fn) { routes[path] = fn; }
export function go(path) { location.hash = '#/' + path; }
export function back() { if (history.length > 1) history.back(); else go('home'); }
export function toast(msg, ms = 2200) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), ms);
}
export function render() {
  const path = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  const fn = routes[path] || routes['home'];
  const app = document.getElementById('app');
  if (current && current.cleanup) { try { current.cleanup(); } catch (e) {} }
  app.scrollTop = 0;
  current = fn(app, path) || null;
}
export function start() { addEventListener('hashchange', render); render(); }
