import { get, set } from 'idb-keyval';

export const COLLECTIONS = ['cooperatives', 'producers', 'employees', 'supplies', 'products', 'orders', 'messages', 'movements', 'stocks', 'kudos', 'notifications'];
const empty = () => Object.fromEntries(COLLECTIONS.map((c) => [c, []]));

export const loadData = async () => ({ ...empty(), ...((await get('gs-data')) || {}) });
export const saveData = (d) => set('gs-data', d);
export const loadOutbox = async () => (await get('gs-outbox')) || [];
export const saveOutbox = (o) => set('gs-outbox', o);
export const getMeta = async () => (await get('gs-meta')) || { since: 0 };
export const setMeta = (m) => set('gs-meta', m);

export const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
