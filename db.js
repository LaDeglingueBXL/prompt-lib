/* ============================================================
   db.js — couche IndexedDB (wrapper maison, zéro dépendance)
   Surface d'API stable : db.ready, db.entries.*, db.briques.*
   Schéma figé d'après 02_Architecture_Donnees.md.
   ============================================================ */

const DB_NAME = "biblio_prompts";
const DB_VERSION = 1;

/* --- promisify an IDBRequest --- */
function req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* --- promisify a transaction's completion --- */
function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/* --- open + create schema --- */
function openDB() {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);

    open.onupgradeneeded = (e) => {
      const db = e.target.result;

      // entries
      if (!db.objectStoreNames.contains("entries")) {
        const s = db.createObjectStore("entries", { keyPath: "id" });
        s.createIndex("type", "type", { unique: false });
        s.createIndex("parent_id", "parent_id", { unique: false });
        s.createIndex("date_creation", "date_creation", { unique: false });
        s.createIndex("tags", "tags", { unique: false, multiEntry: true });
      }

      // briques
      if (!db.objectStoreNames.contains("briques")) {
        const s = db.createObjectStore("briques", { keyPath: "id" });
        s.createIndex("categorie", "categorie", { unique: false });
        s.createIndex("tags", "tags", { unique: false, multiEntry: true });
      }
    };

    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}

/* --- text normalize: lowercase + strip accents (FR-friendly) --- */
function norm(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function uuid() {
  return crypto.randomUUID();
}

/* --- generic store wrapper --- */
class Store {
  constructor(getDB, name) {
    this._getDB = getDB;
    this.name = name;
  }

  async _store(mode) {
    const db = await this._getDB();
    return db.transaction(this.name, mode).objectStore(this.name);
  }

  /** insert; auto id + date_creation if missing. returns the stored object. */
  async add(obj) {
    const record = { ...obj, id: obj.id || uuid() };
    if (this.name === "entries" && !record.date_creation) {
      record.date_creation = new Date().toISOString();
    }
    const store = await this._store("readwrite");
    await req(store.add(record));
    await txDone(store.transaction);
    return record;
  }

  /** insert many in one transaction. returns the stored objects. */
  async bulkAdd(arr) {
    const store = await this._store("readwrite");
    const out = [];
    for (const obj of arr) {
      const record = { ...obj, id: obj.id || uuid() };
      if (this.name === "entries" && !record.date_creation) {
        record.date_creation = new Date().toISOString();
      }
      store.add(record);
      out.push(record);
    }
    await txDone(store.transaction);
    return out;
  }

  async get(id) {
    const store = await this._store("readonly");
    return req(store.get(id));
  }

  /** create-or-replace (update). returns the object. */
  async put(obj) {
    const store = await this._store("readwrite");
    await req(store.put(obj));
    await txDone(store.transaction);
    return obj;
  }

  async delete(id) {
    const store = await this._store("readwrite");
    await req(store.delete(id));
    await txDone(store.transaction);
  }

  async all() {
    const store = await this._store("readonly");
    return req(store.getAll());
  }

  async count() {
    const store = await this._store("readonly");
    return req(store.count());
  }

  /** exact match on an index value (e.g. where("categorie", "style")). */
  async where(indexName, value) {
    const store = await this._store("readonly");
    const idx = store.index(indexName);
    return req(idx.getAll(value));
  }

  async clear() {
    const store = await this._store("readwrite");
    await req(store.clear());
    await txDone(store.transaction);
  }
}

/* --- entries store with full-text-ish search --- */
class EntryStore extends Store {
  /**
   * search across titre + contenu + tags + notes.
   * AND of all tokens, accent-insensitive. Empty query => all (recent first).
   */
  async search(query) {
    const all = await this.all();
    all.sort((a, b) =>
      (b.date_creation || "").localeCompare(a.date_creation || "")
    );

    const tokens = norm(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return all;

    return all.filter((e) => {
      const hay = norm(
        [e.titre, e.contenu, e.notes, (e.tags || []).join(" ")].join(" ")
      );
      return tokens.every((t) => hay.includes(t));
    });
  }

  /** variantes d'une entrée (duplication non-destructive). */
  async children(parentId) {
    return this.where("parent_id", parentId);
  }
}

/* --- briques store with search --- */
class BriqueStore extends Store {
  async search(query) {
    const all = await this.all();
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return all;
    return all.filter((b) => {
      const hay = norm([b.valeur, b.categorie, (b.tags || []).join(" ")].join(" "));
      return tokens.every((t) => hay.includes(t));
    });
  }
}

/* --- singleton db, opened once and reused --- */
let _dbPromise = null;
function getDB() {
  if (!_dbPromise) _dbPromise = openDB();
  return _dbPromise;
}

export const db = {
  ready: getDB(),
  entries: new EntryStore(getDB, "entries"),
  briques: new BriqueStore(getDB, "briques"),
  uuid,
  norm,
};
