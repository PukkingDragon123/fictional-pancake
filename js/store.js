// ---- Where the save lives -------------------------------------------------
// On a plain page that is localStorage. Published as an Artifact the page is
// sandboxed, so the same save also goes to the artifact's own document store
// and is read back on the next open. Both are kept in step; whichever copy was
// written last wins at boot.
const Store = (() => {
  let db = null, ready = false, timer = 0, lastPush = 0;
  const pending = new Map();                 // key -> the newest save waiting to go out
  // one document per slot, so three games never overwrite each other
  const docOf = (key) => 'saves/' + String(key).replace(/[^A-Za-z0-9_\-.~:@+]/g, '_');

  const raced = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

  function local(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function putLocal(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { }
  }

  // Ask the viewer for the store, then read the save it holds. Both steps are
  // capped: a page that never answers must not hold the game hostage.
  async function connect() {
    if (ready) return db;
    try {
      if (typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function') {
        db = await raced(window.claude.use('db'), 3000);
      }
    } catch (e) { db = null; }
    ready = true;
    return db;
  }
  async function readSlot(key) {
    let remote = null;
    try {
      if (db) {
        const snap = await raced(db.doc(docOf(key)).get(), 3000);
        if (snap && snap.exists) {
          const d = snap.data();
          if (d && d.save) { try { remote = JSON.parse(d.save); } catch (e) { remote = null; } }
        }
      }
    } catch (e) { }
    const near = local(key);
    if (remote && near) return (remote.lastSave || 0) >= (near.lastSave || 0) ? remote : near;
    return remote || near;
  }
  // Connect once, then read every slot in parallel: three reads, one wait.
  async function boot(keys) {
    await connect();
    const list = Array.isArray(keys) ? keys : [keys];
    const out = {};
    await Promise.all(list.map(async (k) => { out[k] = await readSlot(k); }));
    return Array.isArray(keys) ? out : out[list[0]];
  }

  // Writes land locally at once and are pushed to the store on a lazy timer,
  // so a busy minute of play is one network write, not two hundred.
  function put(key, obj) {
    putLocal(key, obj);
    if (!db) return;
    pending.set(key, obj);
    if (timer) return;
    const wait = Math.max(0, 4000 - (Date.now() - lastPush));
    timer = setTimeout(flush, wait);
  }
  function flush() {
    clearTimeout(timer); timer = 0;
    if (!db || !pending.size) return;
    lastPush = Date.now();
    for (const [key, body] of pending) {
      try { db.doc(docOf(key)).set({ save: JSON.stringify(body), at: Date.now() }); } catch (e) { }
    }
    pending.clear();
  }
  async function clear(key) {
    try { localStorage.removeItem(key); } catch (e) { }
    pending.delete(key);
    if (db) { try { await raced(db.doc(docOf(key)).delete(), 2000); } catch (e) { } }
  }
  // Settings live outside the slots: they belong to the player, not the save.
  const SET = 'wombat-gods-settings';
  function settings() { return local(SET) || {}; }
  function putSettings(o) { putLocal(SET, o); }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }
  return { boot, put, clear, flush, settings, putSettings, get shared() { return !!db; }, get ready() { return ready; } };
})();
