// Armazenamento local: progresso e configurações (localStorage).
// IndexedDB (músicas/mapas) entra na Etapa 3.
const KEY = 'claudeheroi:v1';
const DEFAULTS = {
  settings: { volume: 0.8, latencyMs: 0, bg: true, vibrate: true, difficulty: 'medio' },
  progress: { xp: 0, level: 1, coins: 0, plays: 0, notesHit: 0, bestCombo: 0, totalScore: 0 },
  records: {}
};
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(DEFAULTS);
    const d = JSON.parse(raw);
    return {
      settings: { ...DEFAULTS.settings, ...(d.settings || {}) },
      progress: { ...DEFAULTS.progress, ...(d.progress || {}) },
      records: d.records || {}
    };
  } catch (e) { return clone(DEFAULTS); }
}
let state = load();
export function get() { return state; }
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (e) { console.warn('Falha ao salvar', e); return false; }
}
export function reset() { state = clone(DEFAULTS); save(); }
