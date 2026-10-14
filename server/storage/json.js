import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLLECTIONS, seedData } from './seed.js';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db.json');

export default function create() {
  let db;
  const persist = () => fs.writeFileSync(FILE, JSON.stringify(db));
  return {
    async init() {
      if (fs.existsSync(FILE)) {
        db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
        COLLECTIONS.forEach((c) => { db.records[c] ||= []; });
        return;
      }
      const s = seedData();
      db = { users: s.users, records: Object.fromEntries(COLLECTIONS.map((c) => [c, []])) };
      s.records.forEach(({ collection, record }) => db.records[collection].push(record));
      persist();
    },
    async getUser(matricule) { return db.users.find((u) => u.matricule === matricule) || null; },
    async listUsers() { return db.users; },
    async saveUser(u) {
      const i = db.users.findIndex((x) => x.matricule === u.matricule);
      if (i < 0) db.users.push(u); else db.users[i] = u;
      persist();
    },
    /** Ajuste le stock d'un produit dans UNE coopérative (et le total du produit). Retourne le nouveau stock de la coopérative,
     *  ou null si le produit est inconnu ou si le stock deviendrait négatif. */
    async adjustStock(coopId, productId, delta) {
      const prod = db.records.products.find((x) => x.id === productId);
      const id = `${coopId}__${productId}`;
      let st = db.records.stocks.find((x) => x.id === id);
      const cur = Number(st?.stockKg) || 0;
      if (!prod || cur + delta < 0) return null;
      const t = Date.now();
      if (!st) { st = { id, cooperativeId: coopId, productId, stockKg: 0, createdAt: t }; db.records.stocks.push(st); }
      st.stockKg = cur + delta; st.updatedAt = st.serverAt = t;
      prod.stockKg = (Number(prod.stockKg) || 0) + delta; prod.updatedAt = prod.serverAt = t;
      persist();
      return st.stockKg;
    },
    async getRecord(collection, id) { return db.records[collection].find((r) => r.id === id) || null; },
    async upsertRecord(collection, record) {
      const list = db.records[collection];
      const i = list.findIndex((r) => r.id === record.id);
      if (i < 0) list.push({ ...record, serverAt: Date.now() });
      else if (list[i].updatedAt <= record.updatedAt) list[i] = { ...list[i], ...record, serverAt: Date.now() };
      persist();
    },
    async listSince(since) {
      return COLLECTIONS.flatMap((c) => db.records[c].filter((r) => r.serverAt > since).map((record) => ({ collection: c, record })));
    }
  };
}
