import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { seedData } from './seed.js';

const SCHEMA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sql', 'schema.sql');

const toUser = (r) => ({
  matricule: r.matricule, salt: r.salt, hash: r.hash, role: r.role, cooperativeId: r.cooperative_id,
  name: r.name, active: r.active, approved: r.approved, company: r.company,
  email: r.email, phone: r.phone, notify: { email: !!r.notify_email, sms: !!r.notify_sms }
});

export default function create() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
  const q = (text, params) => pool.query(text, params);

  return {
    async init() {
      await q(fs.readFileSync(SCHEMA, 'utf8'));
      const { rows } = await q('SELECT count(*)::int AS n FROM users');
      if (rows[0].n > 0) return;
      const s = seedData();
      for (const u of s.users) await this.saveUser(u);
      for (const { collection, record } of s.records) await this.upsertRecord(collection, record);
    },
    async getUser(matricule) {
      const { rows } = await q('SELECT * FROM users WHERE matricule = $1', [matricule]);
      return rows[0] ? toUser(rows[0]) : null;
    },
    async listUsers() {
      return (await q('SELECT * FROM users ORDER BY role, matricule')).rows.map(toUser);
    },
    async saveUser(u) {
      await q(
        `INSERT INTO users (matricule, salt, hash, role, cooperative_id, name, active, approved, company, email, phone, notify_email, notify_sms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (matricule) DO UPDATE SET salt=EXCLUDED.salt, hash=EXCLUDED.hash, role=EXCLUDED.role,
           cooperative_id=EXCLUDED.cooperative_id, name=EXCLUDED.name, active=EXCLUDED.active,
           approved=EXCLUDED.approved, company=EXCLUDED.company, email=EXCLUDED.email, phone=EXCLUDED.phone,
           notify_email=EXCLUDED.notify_email, notify_sms=EXCLUDED.notify_sms`,
        [u.matricule, u.salt, u.hash, u.role, u.cooperativeId ?? null, u.name ?? null, u.active !== false, !!u.approved, u.company ?? null, u.email ?? null, u.phone ?? null, !!u.notify?.email, !!u.notify?.sms]
      );
    },
    /** Stock par coopérative, en transaction : le verrou sur la ligne du produit sérialise les ajustements concurrents,
     *  et la condition WHERE interdit un stock négatif. Le total du produit est mis à jour dans la même transaction. */
    async adjustStock(coopId, productId, delta) {
      const c = await pool.connect();
      const now = Date.now();
      const id = `${coopId}__${productId}`;
      try {
        await c.query('BEGIN');
        const prod = await c.query("SELECT 1 FROM records WHERE collection = 'products' AND id = $1 FOR UPDATE", [productId]);
        if (!prod.rowCount) { await c.query('ROLLBACK'); return null; }
        await c.query(
          `INSERT INTO records (collection, id, data, cooperative_id, updated_at, server_at, deleted)
           VALUES ('stocks', $1, $2::jsonb, $3, $4, $4, false) ON CONFLICT (collection, id) DO NOTHING`,
          [id, JSON.stringify({ id, cooperativeId: coopId, productId, stockKg: 0, createdAt: now, updatedAt: now }), coopId, now]
        );
        const upd = await c.query(
          `UPDATE records
              SET data = jsonb_set(jsonb_set(data, '{stockKg}', to_jsonb((data->>'stockKg')::numeric + $2::numeric)), '{updatedAt}', to_jsonb($3::bigint)),
                  updated_at = $3, server_at = $3
            WHERE collection = 'stocks' AND id = $1 AND (data->>'stockKg')::numeric + $2::numeric >= 0
        RETURNING (data->>'stockKg')::numeric AS stock`,
          [id, delta, now]
        );
        if (!upd.rowCount) { await c.query('ROLLBACK'); return null; }
        await c.query(
          `UPDATE records
              SET data = jsonb_set(jsonb_set(data, '{stockKg}', to_jsonb(COALESCE((data->>'stockKg')::numeric, 0) + $2::numeric)), '{updatedAt}', to_jsonb($3::bigint)),
                  updated_at = $3, server_at = $3
            WHERE collection = 'products' AND id = $1`,
          [productId, delta, now]
        );
        await c.query('COMMIT');
        return Number(upd.rows[0].stock);
      } catch (e) {
        await c.query('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    },
    async getRecord(collection, id) {
      const { rows } = await q('SELECT data FROM records WHERE collection = $1 AND id = $2', [collection, id]);
      return rows[0]?.data || null;
    },
    /** Dernière écriture gagne : la mise à jour n'est appliquée que si elle est plus récente. */
    async upsertRecord(collection, record) {
      await q(
        `INSERT INTO records (collection, id, data, cooperative_id, updated_at, server_at, deleted)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
         ON CONFLICT (collection, id) DO UPDATE SET
           data = records.data || EXCLUDED.data,
           updated_at = EXCLUDED.updated_at,
           server_at = EXCLUDED.server_at,
           deleted = COALESCE((records.data || EXCLUDED.data)->>'deleted', 'false')::boolean
         WHERE records.updated_at <= EXCLUDED.updated_at`,
        [collection, record.id, JSON.stringify(record), record.cooperativeId ?? null, record.updatedAt, Date.now(), !!record.deleted]
      );
    },
    async listSince(since) {
      const { rows } = await q('SELECT collection, data, server_at FROM records WHERE server_at > $1 ORDER BY server_at', [since]);
      return rows.map((r) => ({ collection: r.collection, record: { ...r.data, serverAt: Number(r.server_at) } }));
    }
  };
}
