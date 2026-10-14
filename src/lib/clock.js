/**
 * Horloge de référence de Green System : l'heure GMT (UTC) fournie par le serveur.
 *
 * - À chaque synchronisation, on mesure l'écart entre le serveur et l'appareil et on le mémorise (localStorage).
 * - Hors-ligne, l'heure de confiance = heure de l'appareil + écart mémorisé.
 * - Pendant une session, l'heure avance avec performance.now() (horloge monotone) : changer l'heure du téléphone
 *   en cours d'utilisation n'a aucun effet.
 * - L'heure ne recule jamais d'un démarrage à l'autre (dernière valeur mémorisée).
 * Toute date de l'application (horodatage des saisies, règle des 20 h, date des approvisionnements, affichage) passe par ici.
 */
const KEY = 'gs-clock';
const STALE_MS = 3 * 864e5; // au-delà de 3 jours sans vérification, l'heure est signalée « à vérifier »

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const st = { offset: 0, synced: false, syncedAt: 0, last: 0, ...load() };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* stockage indisponible */ } };

let anchor = { perf: performance.now(), trusted: Math.max(Date.now() + st.offset, st.last) };
let lastSave = 0;

/** Heure GMT de confiance, en millisecondes (epoch). */
export function now() {
  const t = anchor.trusted + (performance.now() - anchor.perf);
  if (t - lastSave > 5000) { lastSave = t; st.last = Math.max(st.last, t); save(); }
  return Math.floor(t);
}

/** Recale l'horloge sur l'heure serveur reçue (rtt = durée aller-retour mesurée avec performance.now()). */
export function calibrate(serverNow, sentPerf, recvPerf) {
  const trusted = serverNow + Math.max(0, recvPerf - sentPerf) / 2;
  st.offset = trusted - Date.now();
  st.synced = true;
  st.syncedAt = trusted;
  if (Math.abs(trusted - now()) > 1000) anchor = { perf: performance.now(), trusted }; // évite les micro-sauts
  st.last = anchor.trusted + (performance.now() - anchor.perf);
  save();
  window.dispatchEvent(new Event('gs-clock'));
}

export const today = () => new Date(now()).toISOString().slice(0, 10); // date GMT, AAAA-MM-JJ
export const hourGMT = () => new Date(now()).getUTCHours();
export const fmtDate = (ms) => new Date(ms).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
export const fmtDateTime = (ms) => `${new Date(ms).toLocaleString('fr-FR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' })} GMT`;
export const fmtTime = (ms) => `${new Date(ms).toISOString().slice(11, 16)} GMT`;

export function clockInfo() {
  const n = now();
  return { now: n, synced: st.synced, verified: st.synced && n - st.syncedAt <= STALE_MS, syncedAt: st.syncedAt, deviceOffset: Date.now() - n };
}
