/*
 * store.js — Persistence layer for the PE/IB interview-prep platform.
 *
 * Roadmap non-negotiable (Phase 0, §3):
 *   "a tiny `store` wrapper that tries window.storage, falls back to memory,
 *    and exposes getState / setState / exportJSON / importJSON.
 *    Prove it survives a reload before building anything on top."
 *
 * NEVER localStorage / sessionStorage (breaks inside Claude artifacts).
 *
 * Design notes
 * ------------
 * - `window.storage` in the artifact sandbox is an ASYNC key/value store, but
 *   the exact method names are not guaranteed across host environments. We
 *   therefore feature-detect a small set of likely shapes (getItem/setItem,
 *   get/set, getState/setState) and adapt. If none is usable we fall back to an
 *   in-memory object so the app never crashes — progress simply won't survive a
 *   hard reload in that degraded mode, which is exactly what export/import JSON
 *   is for (portability between machines / sessions).
 * - All public methods are async and resolve with plain JS values. The whole
 *   app state lives under a single namespaced key, so one read/write moves the
 *   entire state object. (Keeps the storage contract trivial and atomic.)
 * - The module is environment-agnostic: it attaches `window.AppStore` in a
 *   browser and exports via module.exports under Node for testing.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof root !== 'undefined') root.AppStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'pe_ib_platform_state_v1';
  const SCHEMA_VERSION = 1;

  // ---- Backend: in-memory fallback ---------------------------------------
  function createMemoryBackend() {
    const mem = Object.create(null);
    return {
      name: 'memory',
      durable: false, // does NOT survive a hard reload — export/import covers it
      async get(key) {
        return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
      },
      async set(key, value) { mem[key] = value; },
      async remove(key) { delete mem[key]; },
    };
  }

  // ---- Backend: adapter over window.storage ------------------------------
  // Returns null if the supplied object can't be adapted to a usable shape.
  function createWindowStorageBackend(ws) {
    if (!ws || typeof ws !== 'object') return null;

    // Resolve a (get, set, remove) triple from whatever the host exposes.
    let getFn = null, setFn = null, removeFn = null;

    if (typeof ws.getItem === 'function' && typeof ws.setItem === 'function') {
      getFn = (k) => ws.getItem(k);
      setFn = (k, v) => ws.setItem(k, v);
      removeFn = typeof ws.removeItem === 'function' ? (k) => ws.removeItem(k) : null;
    } else if (typeof ws.get === 'function' && typeof ws.set === 'function') {
      getFn = (k) => ws.get(k);
      setFn = (k, v) => ws.set(k, v);
      removeFn = typeof ws.remove === 'function' ? (k) => ws.remove(k)
               : typeof ws.delete === 'function' ? (k) => ws.delete(k) : null;
    } else if (typeof ws.getState === 'function' && typeof ws.setState === 'function') {
      // Single-blob style host store.
      getFn = () => ws.getState();
      setFn = (k, v) => ws.setState(v);
      removeFn = () => ws.setState(null);
    } else {
      return null;
    }

    return {
      name: 'window.storage',
      durable: true,
      async get(key) {
        const raw = await getFn(key);
        return raw == null ? null : raw;
      },
      async set(key, value) { await setFn(key, value); },
      async remove(key) { if (removeFn) await removeFn(key); else await setFn(key, null); },
    };
  }

  // ---- Backend selection -------------------------------------------------
  function pickBackend(opts) {
    opts = opts || {};
    // Test seam: allow injecting a fake window.storage in Node.
    const ws = opts.windowStorage !== undefined
      ? opts.windowStorage
      : (typeof window !== 'undefined' ? window.storage : undefined);
    return createWindowStorageBackend(ws) || createMemoryBackend();
  }

  // ---- Serialization helpers --------------------------------------------
  // We always persist a STRING (most KV hosts only guarantee string values).
  function serialize(state) {
    return JSON.stringify({ __v: SCHEMA_VERSION, state });
  }
  function deserialize(raw) {
    if (raw == null) return null;
    let obj;
    try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch (e) { return null; }
    if (obj && typeof obj === 'object' && '__v' in obj) return obj.state ?? null;
    // Tolerate a bare state object that somehow lacks the envelope.
    return obj ?? null;
  }

  // ---- Public store ------------------------------------------------------
  function createStore(opts) {
    const backend = pickBackend(opts);
    let cache = null;       // last known in-memory copy
    let loaded = false;

    async function getState() {
      if (!loaded) {
        const raw = await backend.get(STORAGE_KEY);
        cache = deserialize(raw);
        loaded = true;
      }
      return cache;
    }

    async function setState(next) {
      cache = next;
      loaded = true;
      await backend.set(STORAGE_KEY, serialize(next));
      return cache;
    }

    // Shallow-merge convenience used heavily by the app (XP, streak, etc.).
    async function patchState(partial) {
      const cur = (await getState()) || {};
      return setState(Object.assign({}, cur, partial));
    }

    async function clear() {
      cache = null;
      loaded = true;
      await backend.remove(STORAGE_KEY);
    }

    // Export: a portable, human-readable JSON document.
    async function exportJSON() {
      const state = await getState();
      return JSON.stringify(
        { app: 'pe-ib-platform', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), state },
        null, 2
      );
    }

    // Import: accepts either the export envelope or a bare state object.
    async function importJSON(text) {
      let parsed;
      try { parsed = JSON.parse(text); }
      catch (e) { throw new Error('Import échoué : JSON invalide.'); }
      const incoming = (parsed && parsed.state !== undefined) ? parsed.state : parsed;
      if (incoming == null || typeof incoming !== 'object') {
        throw new Error('Import échoué : aucun état exploitable trouvé.');
      }
      await setState(incoming);
      return incoming;
    }

    return {
      backendName: backend.name,
      isDurable: backend.durable,
      getState, setState, patchState, clear, exportJSON, importJSON,
      STORAGE_KEY, SCHEMA_VERSION,
    };
  }

  return { createStore, STORAGE_KEY, SCHEMA_VERSION };
});
