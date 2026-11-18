// IndexedDB: músicas importadas. Store "songs" = metadados + mapas; store "audio" = arquivo original.
const DB = 'claudeheroi-db';
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('Este navegador não permite salvar músicas (IndexedDB indisponível).'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('songs', { keyPath: 'id' }); r.result.createObjectStore('audio', { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { dbp = null; rej(r.error || new Error('Falha ao abrir o armazenamento.')); };
  });
  return dbp;
}
const wrap = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
export async function putSong(meta, audioBuf) {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(['songs', 'audio'], 'readwrite');
    tx.objectStore('songs').put(meta); tx.objectStore('audio').put({ id: meta.id, data: audioBuf });
    tx.oncomplete = () => res(true);
    tx.onerror = tx.onabort = () => rej(tx.error || new Error('Sem espaço para salvar a música.'));
  });
}
export async function listSongs() { const db = await open(); const l = await wrap(db.transaction('songs').objectStore('songs').getAll()); return l.sort((a, b) => b.created - a.created); }
export async function getSong(id) { const db = await open(); return wrap(db.transaction('songs').objectStore('songs').get(id)); }
export async function getAudio(id) { const db = await open(); const r = await wrap(db.transaction('audio').objectStore('audio').get(id)); return r && r.data; }
export async function delSong(id) {
  const db = await open();
  return new Promise((res, rej) => { const tx = db.transaction(['songs', 'audio'], 'readwrite'); tx.objectStore('songs').delete(id); tx.objectStore('audio').delete(id); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); });
}
