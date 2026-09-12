// ---- Where the save lives -------------------------------------------------
// On a plain page that is localStorage. Published as an Artifact the page is
// sandboxed, so the same save also goes to the artifact's own document store
// and is read back on the next open. Both are kept in step; whichever copy was
// written last wins at boot.
const Store = (() => {
  let db = null, ready = false, pending = null, timer = 0, lastPush = 0;
  const DOC = 'saves/game';

  const raced = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

  function local(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function putLocal(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { }
  }

  // Ask the viewer for the store, then read the save it holds. Both steps are
  // capped: a page that never answers must not hold the game hostage.
  async function boot(key) {
    let remote = null;
    try {
      if (typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function') {
        db = await raced(window.claude.use('db'), 3000);
        if (db) {
          const snap = await raced(db.doc(DOC).get(), 3000);
          if (snap && snap.exists) {
            const d = snap.data();
            if (d && d.save) { try { remote = JSON.parse(d.save); } catch (e) { remote = null; } }
          }
        }
      }
    } catch (e) { db = null; }
    ready = true;
    const near = local(key);
    if (remote && near) return (remote.lastSave || 0) >= (near.lastSave || 0) ? remote : near;
    return remote || near;
  }

  // Writes land locally at once and are pushed to the store on a lazy timer,
  // so a busy minute of play is one network write, not two hundred.
  function put(key, obj) {
    putLocal(key, obj);
    if (!db) return;
    pending = obj;
    if (timer) return;
    const wait = Math.max(0, 4000 - (Date.now() - lastPush));
    timer = setTimeout(flush, wait);
  }
  function flush() {
    clearTimeout(timer); timer = 0;
    if (!db || !pending) return;
    const body = pending; pending = null; lastPush = Date.now();
    try { db.doc(DOC).set({ save: JSON.stringify(body), at: Date.now() }); } catch (e) { }
  }
  async function clear(key) {
    try { localStorage.removeItem(key); } catch (e) { }
    clearTimeout(timer); timer = 0; pending = null;
    if (db) { try { await raced(db.doc(DOC).delete(), 2000); } catch (e) { } }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }
  return { boot, put, clear, flush, get shared() { return !!db; }, get ready() { return ready; } };
})();
