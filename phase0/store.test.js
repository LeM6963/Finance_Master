/*
 * store.test.js — Proof that the persistence layer behaves per the roadmap.
 * Run: node phase0/store.test.js
 *
 * "Reload" is simulated by destroying the store instance and creating a fresh
 * one over the SAME backing key/value store — exactly what happens when a
 * browser tab reloads the page: new JS world, same window.storage host.
 */
const { createStore } = require('./store.js');

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name + '  <-- FAILED'); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

// A fake durable host store (string KV) that persists across store instances,
// mimicking window.storage surviving a page reload.
function makeFakeWindowStorage() {
  const disk = Object.create(null);
  return {
    async getItem(k) { return k in disk ? disk[k] : null; },
    async setItem(k, v) { disk[k] = String(v); },
    async removeItem(k) { delete disk[k]; },
    _disk: disk,
  };
}

(async function run() {
  console.log('\n=== Persistence layer proof ===\n');

  // --- 1. Durable backend: survives a "reload" --------------------------
  console.log('[1] window.storage backend survives a reload');
  {
    const host = makeFakeWindowStorage();
    const a = createStore({ windowStorage: host });
    check('selects window.storage backend', a.backendName === 'window.storage');
    check('reports durable', a.isDurable === true);

    await a.setState({ xp: 120, streak: 3, rank: 'Analyst', mastery: { LBO: 0.4 } });

    // Simulate reload: brand-new store instance, same host.
    const b = createStore({ windowStorage: host });
    const restored = await b.getState();
    check('state survives reload', eq(restored, { xp: 120, streak: 3, rank: 'Analyst', mastery: { LBO: 0.4 } }));
    check('persisted value is a string blob', typeof host._disk[a.STORAGE_KEY] === 'string');
  }

  // --- 2. Memory fallback when no window.storage ------------------------
  console.log('\n[2] memory fallback when window.storage is absent');
  {
    const a = createStore({ windowStorage: undefined });
    check('falls back to memory backend', a.backendName === 'memory');
    check('reports non-durable', a.isDurable === false);
    await a.setState({ xp: 5 });
    check('reads back within same session', eq(await a.getState(), { xp: 5 }));
    // A fresh memory store does NOT see prior data (documents why export exists).
    const b = createStore({ windowStorage: undefined });
    check('memory does not leak across instances', (await b.getState()) === null);
  }

  // --- 3. Unusable host object also falls back safely -------------------
  console.log('\n[3] unusable window.storage shape falls back to memory');
  {
    const a = createStore({ windowStorage: { foo: 1 } }); // no get/set methods
    check('falls back to memory', a.backendName === 'memory');
    await a.setState({ ok: true });
    check('still functional', eq(await a.getState(), { ok: true }));
  }

  // --- 4. patchState shallow-merges -------------------------------------
  console.log('\n[4] patchState merges without clobbering');
  {
    const host = makeFakeWindowStorage();
    const s = createStore({ windowStorage: host });
    await s.setState({ xp: 10, streak: 1 });
    await s.patchState({ streak: 2 });
    check('merges fields', eq(await s.getState(), { xp: 10, streak: 2 }));
  }

  // --- 5. export / import round-trip + portability ----------------------
  console.log('\n[5] export / import JSON round-trip');
  {
    const host1 = makeFakeWindowStorage();
    const src = createStore({ windowStorage: host1 });
    await src.setState({ xp: 999, badges: ['first_lbo'], decks: { ma: [1, 2, 3] } });
    const dump = await src.exportJSON();
    check('export is valid JSON', (() => { try { JSON.parse(dump); return true; } catch { return false; } })());
    check('export carries schemaVersion', JSON.parse(dump).schemaVersion === src.SCHEMA_VERSION);

    // Import into a DIFFERENT machine (fresh host + fresh store).
    const host2 = makeFakeWindowStorage();
    const dst = createStore({ windowStorage: host2 });
    await dst.importJSON(dump);
    check('imported state matches source', eq(await dst.getState(), { xp: 999, badges: ['first_lbo'], decks: { ma: [1, 2, 3] } }));
    // And it persisted on the destination host (survives reload there too).
    const dst2 = createStore({ windowStorage: host2 });
    check('imported state is durable on destination', eq((await dst2.getState()).xp, 999));
  }

  // --- 6. import accepts a bare state object & rejects garbage -----------
  console.log('\n[6] import tolerance & validation');
  {
    const s = createStore({ windowStorage: makeFakeWindowStorage() });
    await s.importJSON(JSON.stringify({ xp: 1 })); // bare object, no envelope
    check('accepts bare state object', eq(await s.getState(), { xp: 1 }));
    let threw = false;
    try { await s.importJSON('not json'); } catch { threw = true; }
    check('rejects invalid JSON', threw);
    let threw2 = false;
    try { await s.importJSON('42'); } catch { threw2 = true; }
    check('rejects non-object state', threw2);
  }

  // --- 7. clear wipes state ---------------------------------------------
  console.log('\n[7] clear resets state');
  {
    const host = makeFakeWindowStorage();
    const s = createStore({ windowStorage: host });
    await s.setState({ xp: 1 });
    await s.clear();
    check('state cleared in-session', (await s.getState()) === null);
    const s2 = createStore({ windowStorage: host });
    check('clear survived reload', (await s2.getState()) === null);
  }

  console.log('\n=== ' + passed + ' passed, ' + failed + ' failed ===\n');
  process.exit(failed === 0 ? 0 : 1);
})();
