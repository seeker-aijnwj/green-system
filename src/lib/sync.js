import { calibrate } from './clock.js';
import { COLLECTIONS, getMeta, loadData, loadOutbox, saveData, saveOutbox, setMeta } from './db.js';

// Collections dont le serveur fait foi (stocks calculés côté serveur).
const SERVER_OWNED = ['products', 'stocks', 'movements', 'notifications'];

/** Envoie les modifications locales puis récupère celles du serveur (dernière écriture gagne). */
export async function syncNow(token) {
  const sent = await loadOutbox();
  const { since } = await getMeta();
  const sentPerf = performance.now();
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
    body: JSON.stringify({ changes: sent, since })
  });
  if (!res.ok) {
    const err = new Error(`Synchronisation refusée (${res.status})`);
    err.status = res.status; // 401 : session expirée, 403 : compte désactivé. La file d'attente est conservée.
    throw err;
  }
  const { records, now, rejected = 0, reasons = [] } = await res.json();
  calibrate(now, sentPerf, performance.now()); // l'heure GMT du serveur devient l'horloge de l'application

  const data = await loadData();
  for (const { collection, record, force } of records) {
    if (!COLLECTIONS.includes(collection)) continue;
    const list = data[collection];
    const i = list.findIndex((x) => x.id === record.id);
    if (i < 0) list.push(record);
    // Le serveur fait foi pour les produits (stock) et pour les corrections de modifications refusées.
    else if (force || SERVER_OWNED.includes(collection) || list[i].updatedAt <= record.updatedAt) list[i] = record;
  }
  await saveData(data);
  const rest = (await loadOutbox()).slice(sent.length);
  await saveOutbox(rest);
  await setMeta({ since: now });
  return { data, pending: rest.length, rejected, reasons };
}
