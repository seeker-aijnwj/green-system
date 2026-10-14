// Firestore via le SDK Admin : seul le serveur y accède (les règles interdisent tout accès direct).
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAnalytics } from "firebase/analytics";
import { seedData } from './seed.js';

export default function create() {
  let db;
  const docId = (collection, id) => `${collection}__${id}`;
  return {
    async init() {
      if (!getApps().length) {
        // FIREBASE_SERVICE_ACCOUNT = contenu JSON de la clé ; sinon GOOGLE_APPLICATION_CREDENTIALS.
        const credential = process.env.FIREBASE_SERVICE_ACCOUNT
          ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
          : applicationDefault();
        initializeApp({ credential });
        const analytics = getAnalytics(app);
      }
      db = getFirestore();
      if (!(await db.collection('users').limit(1).get()).empty) return;
      const s = seedData();
      for (const u of s.users) await this.saveUser(u);
      for (const { collection, record } of s.records) await this.upsertRecord(collection, record);
    },
    async getUser(matricule) {
      const d = await db.collection('users').doc(matricule).get();
      return d.exists ? d.data() : null;
    },
    async listUsers() { return (await db.collection('users').get()).docs.map((d) => d.data()); },
    async saveUser(u) { await db.collection('users').doc(u.matricule).set(u); },
    /** Transaction Firestore : stock de la coopérative et total du produit mis à jour atomiquement. */
    async adjustStock(coopId, productId, delta) {
      const id = `${coopId}__${productId}`;
      const pref = db.collection('records').doc(docId('products', productId));
      const sref = db.collection('records').doc(docId('stocks', id));
      return db.runTransaction(async (tx) => {
        const [p, st] = await Promise.all([tx.get(pref), tx.get(sref)]);
        const cur = Number(st.data()?.stockKg) || 0;
        if (!p.exists || cur + delta < 0) return null;
        const now = Date.now();
        tx.set(sref, { _collection: 'stocks', id, cooperativeId: coopId, productId, stockKg: cur + delta, createdAt: st.data()?.createdAt ?? now, updatedAt: now, serverAt: now }, { merge: true });
        tx.update(pref, { stockKg: (Number(p.data().stockKg) || 0) + delta, updatedAt: now, serverAt: now });
        return cur + delta;
      });
    },
    async getRecord(collection, id) {
      const d = await db.collection('records').doc(docId(collection, id)).get();
      if (!d.exists) return null;
      const { _collection, ...record } = d.data();
      return record;
    },
    async upsertRecord(collection, record) {
      const ref = db.collection('records').doc(docId(collection, record.id));
      await db.runTransaction(async (tx) => {
        const cur = await tx.get(ref);
        if (cur.exists && cur.data().updatedAt > record.updatedAt) return; // dernière écriture gagne
        tx.set(ref, { ...record, _collection: collection, serverAt: Date.now() }, { merge: true });
      });
    },
    async listSince(since) {
      const snap = await db.collection('records').where('serverAt', '>', since).orderBy('serverAt').get();
      return snap.docs.map((d) => {
        const { _collection, ...record } = d.data();
        return { collection: _collection, record };
      });
    }
  };
}
