// API Green System : connexion, comptes utilisateurs, agrément des clients, synchronisation.
// Le stockage (json | postgres | firebase) est choisi par la variable STORAGE.
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import storage from './storage/index.js';
import { COLLECTIONS, hashPw, newCredentials } from './storage/seed.js';
import { createNotifier } from './notify/index.js';
import { normPhone, validEmail, validPhone } from './notify/util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
await storage.init();
// Notifications optionnelles (e-mail / SMS) : inactives tant qu'aucun fournisseur n'est configuré dans .env.
const notifier = createNotifier(storage, { coopSees: () => COOP_SEES });

const ROLES = ['administrateur', 'gestionnaire', 'agent', 'client'];
const ORDER_STATUS = ['nouveau', 'en négociation', 'validée', 'refusée'];
const COOP_SCOPED = ['producers', 'employees', 'supplies'];

// ---- Sessions : jetons signés (HMAC), valables 7 jours, sans état serveur (survivent à un redémarrage).
const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
if (!process.env.SESSION_SECRET) console.warn('⚠ SESSION_SECRET non défini : valeur de développement utilisée.');
const sign = (p) => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
const makeToken = (m) => {
  const p = Buffer.from(JSON.stringify({ m, exp: Date.now() + 7 * 864e5 })).toString('base64url');
  return `${p}.${sign(p)}`;
};
function readToken(t) {
  try {
    const [p, sig] = String(t).split('.');
    const a = Buffer.from(sig || ''), b = Buffer.from(sign(p));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const d = JSON.parse(Buffer.from(p, 'base64url'));
    return d.exp > Date.now() ? d.m : null;
  } catch { return null; }
}

const view = (u) => ({ matricule: u.matricule, name: u.name, role: u.role, cooperativeId: u.cooperativeId ?? null, approved: !!u.approved, company: u.company ?? null, email: u.email ?? null, phone: u.phone ?? null, notify: { email: !!u.notify?.email, sms: !!u.notify?.sms } });
const adminView = (u) => ({ ...view(u), active: u.active !== false });

/** { s } visiteur (s = null) ou connecté ; { invalid } jeton inconnu/expiré ; { inactive } compte désactivé. */
async function auth(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!t) return { s: null };
  const m = readToken(t);
  const u = m && (await storage.getUser(m));
  if (!u) return { invalid: true };
  if (u.active === false) return { inactive: true };
  return { s: view(u) };
}
const deny = (res, a) => res.status(a.inactive ? 403 : a.invalid ? 401 : 403).json({ error: a.inactive ? 'inactive' : a.invalid ? 'session' : 'forbidden' });

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => { console.error(e); res.status(500).json({ error: 'server' }); });
const need = (...roles) => h(async (req, res, next) => {
  const a = await auth(req);
  if (!a.s || !roles.includes(a.s.role)) return deny(res, a);
  req.s = a.s; next();
});

const app = express();
app.use(express.json({ limit: '2mb' }));

const findUser = async (id) => (await storage.getUser(String(id).trim())) || (await storage.getUser(String(id).trim().toLowerCase()));

app.post('/api/login', h(async (req, res) => {
  const { matricule, password } = req.body || {};
  const u = await findUser(matricule || '');
  if (!u || hashPw(password, u.salt) !== u.hash) return res.status(401).json({ error: 'invalid' });
  if (u.active === false) return res.status(403).json({ error: 'inactive' });
  res.json({ ...view(u), token: makeToken(u.matricule) });
}));

/** Inscription libre d'un client : le compte reste « non agréé » jusqu'à validation par l'administration. */
app.post('/api/register', h(async (req, res) => {
  const { company, name, email, password } = req.body || {};
  const id = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id) || !company?.trim() || !name?.trim() || String(password || '').length < 6)
    return res.status(400).json({ error: 'invalid' });
  if (await storage.getUser(id)) return res.status(409).json({ error: 'exists' });
  const u = { matricule: id, role: 'client', name: name.trim(), company: company.trim(), cooperativeId: null, active: true, approved: false, email: id, phone: null, notify: { email: !!req.body.notifyEmail, sms: false }, ...newCredentials(password) };
  await storage.saveUser(u);
  res.status(201).json({ ...view(u), token: makeToken(id) });
}));

app.get('/api/me', h(async (req, res) => {
  const a = await auth(req);
  if (!a.s) return deny(res, a);
  res.json(a.s);
}));

// ---- Gestion des utilisateurs (administrateur)
app.get('/api/users', need('administrateur'), h(async (req, res) => {
  res.json((await storage.listUsers()).map(adminView));
}));

app.post('/api/users', need('administrateur'), h(async (req, res) => {
  const { matricule, name, role, cooperativeId, company, password, email, phone, notify } = req.body || {};
  const id = String(matricule || '').trim();
  if (!id || !name?.trim() || !ROLES.includes(role) || String(password || '').length < 6) return res.status(400).json({ error: 'invalid' });
  if (role === 'gestionnaire' && !cooperativeId) return res.status(400).json({ error: 'cooperative' });
  if (await storage.getUser(id)) return res.status(409).json({ error: 'exists' });
  if ((email && !validEmail(email)) || (phone && !validPhone(phone))) return res.status(400).json({ error: 'contact' });
  const u = {
    email: email ? String(email).trim().toLowerCase() : role === 'client' ? id : null, phone: phone ? normPhone(phone) : null,
    notify: { email: !!notify?.email && !!(email || role === 'client'), sms: !!notify?.sms && !!phone },
    matricule: id, role, name: name.trim(), active: true, company: company?.trim() || null,
    cooperativeId: role === 'gestionnaire' ? cooperativeId : null, approved: role === 'client' ? !!req.body.approved : false,
    ...newCredentials(password)
  };
  await storage.saveUser(u);
  res.status(201).json(adminView(u));
}));

app.patch('/api/users/:matricule', need('administrateur'), h(async (req, res) => {
  const u = await storage.getUser(req.params.matricule);
  if (!u) return res.status(404).json({ error: 'notfound' });
  const b = req.body || {};
  if (u.matricule === req.s.matricule && (b.active === false || (b.role && b.role !== u.role)))
    return res.status(400).json({ error: 'self' }); // on ne peut pas se désactiver ni se rétrograder soi-même
  if (b.role !== undefined) { if (!ROLES.includes(b.role)) return res.status(400).json({ error: 'invalid' }); u.role = b.role; }
  for (const k of ['name', 'company', 'cooperativeId']) if (b[k] !== undefined) u[k] = b[k] || null;
  if (b.active !== undefined) u.active = !!b.active;
  const wasApproved = !!u.approved;
  if (b.approved !== undefined) u.approved = !!b.approved;
  if (b.email !== undefined || b.phone !== undefined) {
    if ((b.email && !validEmail(b.email)) || (b.phone && !validPhone(b.phone))) return res.status(400).json({ error: 'contact' });
    if (b.email !== undefined) u.email = b.email ? String(b.email).trim().toLowerCase() : null;
    if (b.phone !== undefined) u.phone = b.phone ? normPhone(b.phone) : null;
  }
  if (b.notify) u.notify = { email: !!b.notify.email && !!u.email, sms: !!b.notify.sms && !!u.phone };
  if (b.password !== undefined) {
    if (String(b.password).length < 6) return res.status(400).json({ error: 'invalid' });
    Object.assign(u, newCredentials(b.password));
  }
  if (u.role === 'gestionnaire' && !u.cooperativeId) return res.status(400).json({ error: 'cooperative' });
  if (u.role !== 'gestionnaire') u.cooperativeId = null;
  await storage.saveUser(u);
  if (u.role === 'client' && u.approved && !wasApproved) notifier.clientApproved(u).catch((e) => console.error('[notify]', e));
  res.json(adminView(u));
}));

// ---- Profil : chacun gère ses coordonnées et choisit ses rappels (e-mail et/ou SMS, jamais imposés)
const anyRole = need(...ROLES);
app.patch('/api/me', anyRole, h(async (req, res) => {
  const u = await storage.getUser(req.s.matricule);
  const b = req.body || {};
  if (b.name !== undefined) { if (!String(b.name).trim()) return res.status(400).json({ error: 'invalid' }); u.name = String(b.name).trim(); }
  if (b.email !== undefined) {
    if (b.email && !validEmail(b.email)) return res.status(400).json({ error: 'email' });
    u.email = b.email ? String(b.email).trim().toLowerCase() : null;
  }
  if (b.phone !== undefined) {
    if (b.phone && !validPhone(b.phone)) return res.status(400).json({ error: 'phone' });
    u.phone = b.phone ? normPhone(b.phone) : null;
  }
  const want = b.notify ? { email: !!b.notify.email, sms: !!b.notify.sms } : { email: !!u.notify?.email, sms: !!u.notify?.sms };
  if ((want.email && !u.email) || (want.sms && !u.phone)) return res.status(400).json({ error: 'contact' }); // pas de rappel sans coordonnée
  u.notify = want;
  if (b.newPassword !== undefined) {
    if (!b.currentPassword || hashPw(b.currentPassword, u.salt) !== u.hash) return res.status(403).json({ error: 'password' });
    if (String(b.newPassword).length < 6) return res.status(400).json({ error: 'invalid' });
    Object.assign(u, newCredentials(b.newPassword));
  }
  await storage.saveUser(u);
  res.json(view(u));
}));

// ---- Notifications : état, message de test, relance manuelle
app.get('/api/notify/status', anyRole, (req, res) => res.json(notifier.status()));
app.post('/api/notify/test', anyRole, h(async (req, res) => {
  const u = await storage.getUser(req.s.matricule);
  const channels = notifier.channelsOf(u);
  if (!channels.length) return res.status(400).json({ error: 'nochannel' });
  res.json({ results: await notifier.test(u) });
}));
app.post('/api/notify/run-reminders', need('administrateur'), h(async (req, res) => res.json(await notifier.runReminders())));

// ---- Temps : l'heure de référence est celle du serveur en UTC/GMT (Côte d'Ivoire = GMT toute l'année).
app.get('/api/time', (req, res) => res.json({ now: Date.now(), iso: new Date().toISOString() }));

// ---- Synchronisation : droits par rôle, avec nettoyage des champs que chaque rôle peut écrire
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

/** Répartition d'une commande entre coopératives : [{ cooperativeId, quantityKg }], sans doublon ni quantité nulle. */
function cleanAllocations(a) {
  if (!Array.isArray(a)) return [];
  const seen = new Set();
  const out = [];
  for (const x of a) {
    const q = Number(x?.quantityKg);
    if (!x?.cooperativeId || !(q > 0) || seen.has(x.cooperativeId)) continue;
    seen.add(x.cooperativeId);
    out.push({ cooperativeId: String(x.cooperativeId), quantityKg: q });
  }
  return out;
}

/** Une coopérative accepte ou refuse SA part d'une commande (l'administrateur peut le faire en son nom).
 *  La réponse porte sur la quantité vue par la coopérative : si la proposition a changé entre-temps, elle est refusée. */
function confirmShare(s, coopId, r, ex, onBehalf = false) {
  const c = r.confirmation || {};
  const mine = cleanAllocations(ex.allocations).find((a) => a.cooperativeId === coopId);
  if (!mine || ex.stockApplied || !['nouveau', 'en négociation'].includes(ex.status) || !['accepted', 'declined'].includes(c.status)) return null;
  if (Number(c.quantityKg) !== mine.quantityKg) return 'obsolete';
  return {
    id: r.id, updatedAt: r.updatedAt,
    confirmations: { ...(ex.confirmations || {}), [coopId]: { status: c.status, quantityKg: mine.quantityKg, reason: String(c.reason || '').slice(0, 200), at: Date.now(), by: s.matricule, ...(onBehalf ? { onBehalf: true } : {}) } }
  };
}

/** Retourne l'enregistrement autorisé (nettoyé), ou null (droits), ou un code d'erreur (ex. 'justification'). */
function authorize(s, collection, r, ex) {
  const base = { id: r.id, createdAt: r.createdAt, updatedAt: r.updatedAt };
  if (['stocks', 'movements', 'notifications'].includes(collection)) return null; // écrits uniquement par le serveur
  if (s?.role === 'administrateur') {
    if (collection === 'products') { const { stockKg, ...rest } = r; return ex ? rest : { ...rest, stockKg: 0 }; } // le stock n'est jamais écrit à la main
    if (collection === 'orders') {
      const { confirmation, confirmations, ...rest } = r; // les confirmations sont gérées par le serveur
      return confirmation?.cooperativeId && ex ? confirmShare(s, String(confirmation.cooperativeId), r, ex, true) : rest;
    }
    return r;
  }
  if (collection === 'messages') return ex || r.deleted ? null : { ...base, ...pick(r, ['name', 'email', 'body']) };
  if (!s) return null;

  if (collection === 'orders') {
    if (s.role === 'client' && s.approved && !ex && Number(r.quantityKg) > 0)
      return { ...base, ...pick(r, ['productId', 'note', 'preferredCooperativeId']), quantityKg: Number(r.quantityKg), status: 'nouveau', price: null, clientId: s.matricule, company: s.company || s.name };
    if (s.role === 'agent' && ex)
      return { id: r.id, updatedAt: r.updatedAt, ...pick(r, ['price', 'agentNote']), ...(Array.isArray(r.allocations) ? { allocations: cleanAllocations(r.allocations) } : {}), ...(ORDER_STATUS.includes(r.status) ? { status: r.status } : {}), updatedBy: s.matricule };
    if (s.role === 'gestionnaire' && ex && r.confirmation) return confirmShare(s, s.cooperativeId, r, ex);
    return null;
  }
  if (collection === 'kudos') {
    // Mot d'entraide : une coopérative écrit toujours en son propre nom, avec un message court ; pas de modification.
    const message = String(r.message || '').trim().slice(0, 140);
    if (s.role !== 'gestionnaire' || ex || !message || !['felicitations', 'encouragement'].includes(r.kind) || !r.toCooperativeId) return null;
    return { ...base, fromCooperativeId: s.cooperativeId, toCooperativeId: String(r.toCooperativeId), kind: r.kind, message, ...(r.orderId ? { orderId: String(r.orderId) } : {}) };
  }
  if (s.role === 'gestionnaire' && COOP_SCOPED.includes(collection)) {
    if ((ex?.cooperativeId ?? r.cooperativeId) !== s.cooperativeId) return null;
    if (r.cooperativeId && r.cooperativeId !== s.cooperativeId) return null;
    if (r.validated === true && !ex?.validated) return null; // seule l'administration valide
    // Règles de gestion, vérifiées avec l'heure GMT de l'enregistrement : justification obligatoire pour
    // toute modification d'approvisionnement après 20 h, et pour toute suppression avant validation par l'administration.
    const late = collection === 'supplies' && new Date(r.updatedAt).getUTCHours() >= 20;
    const earlyDelete = collection !== 'supplies' && r.deleted && !ex?.validated;
    if (ex && (late || earlyDelete) && !String(r.justification || '').trim()) return 'justification';
    return r;
  }
  return null;
}

function canRead(s, collection, r) {
  if (['cooperatives', 'products'].includes(collection)) return true;
  if (!s) return false;
  if (s.role === 'administrateur') return true;
  if (collection === 'orders') {
    return s.role === 'agent' || (s.role === 'client' && r.clientId === s.matricule)
      || (s.role === 'gestionnaire' && (r.participants || []).includes(s.cooperativeId)); // les coopératives concernées voient la commande
  }
  if (collection === 'kudos') return ['gestionnaire', 'agent'].includes(s.role); // le mur d'entraide est visible de toute l'union
  if (collection === 'stocks' && s.role === 'agent') return true; // l'agent choisit la coopérative qui livre
  return s.role === 'gestionnaire' && ['producers', 'employees', 'supplies', 'stocks', 'movements'].includes(collection) && r.cooperativeId === s.cooperativeId;
}

const move = (s, cooperativeId, productId, delta, reason, extra = {}) => {
  const now = Date.now();
  return storage.upsertRecord('movements', { id: crypto.randomUUID(), cooperativeId, productId, delta, reason, by: s?.matricule ?? 'système', createdAt: now, updatedAt: now, ...extra });
};

/** Les coopératives voient les commandes auxquelles elles participent (produit, quantité, prix, répartition entre
 *  coopératives) mais jamais les coordonnées du client ni les notes internes. */
// ┌─ TRANSPARENCE ─────────────────────────────────────────────────────────────────────────────────────────┐
// │ Ce que les coopératives participantes voient en plus de la commande. UNE seule ligne à modifier :       │
// │   ['price', 'company'] = prix négocié + nom de l'entreprise cliente (transparence totale, par défaut)   │
// │   ['price']            = prix seulement      ·   []  = ni prix ni client (répartition seule)            │
// └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
const COOP_SEES = ['price', 'company'];
const SAFE_ORDER = ['id', 'productId', 'quantityKg', 'status', 'allocations', 'stockAllocations', 'stockApplied', 'confirmations', 'validatedAt', 'participants', 'createdAt', 'updatedAt', 'serverAt', 'deleted', ...COOP_SEES];
const project = (s, x) => (s?.role === 'gestionnaire' && x.collection === 'orders' ? { ...x, record: pick(x.record, SAFE_ORDER) } : x);

/** Stock par coopérative, avec répartition d'une commande entre plusieurs coopératives.
 *  - Une vente « validée » débite le stock de CHAQUE coopérative de sa répartition ; la somme des parts doit égaler la quantité commandée.
 *  - Si la répartition ou le statut change (ou si la commande est supprimée), seules les différences sont appliquées par coopérative.
 *  - Les débits sont faits en premier ; si l'un échoue (stock insuffisant), tout ce qui a déjà été débité est annulé.
 *  - Idempotent grâce aux champs serveur stockApplied / stockAllocations. */
async function applyOrderStock(s, rec, ex) {
  const m = { ...ex, ...rec };
  const alloc = cleanAllocations(m.allocations);
  const qty = Number(m.quantityKg) || 0;
  const was = !!ex?.stockApplied;
  const oldA = ex?.stockAllocations ?? [];
  const want = m.status === 'validée' && !m.deleted;
  // Une confirmation ne vaut que pour la part qui a été vue : si la part d'une coopérative change, elle doit répondre à nouveau.
  const known = rec.confirmations ?? ex?.confirmations ?? {};
  const conf = Object.fromEntries(alloc.filter((a) => known[a.cooperativeId]?.quantityKg === a.quantityKg).map((a) => [a.cooperativeId, known[a.cooperativeId]]));
  if (want && sum(alloc.map((a) => a.quantityKg)) !== qty) return { error: 'repartition' };
  if (want && alloc.some((a) => conf[a.cooperativeId]?.status !== 'accepted')) return { error: 'confirmation' }; // toutes les coopératives doivent avoir accepté

  const target = want ? alloc : [];
  const change = new Map(); // coopérative -> variation de stock (+ restitue, − débite)
  oldA.forEach((a) => change.set(a.cooperativeId, (change.get(a.cooperativeId) || 0) + a.quantityKg));
  target.forEach((a) => change.set(a.cooperativeId, (change.get(a.cooperativeId) || 0) - a.quantityKg));
  const steps = [...change].filter(([, d]) => d !== 0).sort((a, b) => a[1] - b[1]); // débits d'abord

  const done = [];
  for (const [coopId, d] of steps) {
    if ((await storage.adjustStock(coopId, m.productId, d)) === null) {
      for (const [c, dd] of done) await storage.adjustStock(c, m.productId, -dd); // annule les débits déjà faits
      return { error: 'stock' };
    }
    done.push([coopId, d]);
  }
  for (const [coopId, d] of done) await move(s, coopId, m.productId, d, d < 0 ? 'vente validée' : want ? 'répartition modifiée' : 'vente annulée', { orderId: m.id });

  const participants = [...new Set([...(ex?.participants ?? []), ...alloc.map((a) => a.cooperativeId), ...oldA.map((a) => a.cooperativeId)])];
  return { rec: { ...rec, allocations: alloc, confirmations: conf, participants, stockApplied: want, stockAllocations: target, validatedAt: want && !was ? Date.now() : (ex?.validatedAt ?? null) } };
}

/** Un approvisionnement augmente le stock de SA coopérative ; le corriger ou le supprimer ajuste la différence
 *  (refusé si la quantité a déjà été vendue). */
async function applySupplyStock(s, rec, ex) {
  const m = { ...ex, ...rec };
  const productId = ex?.productId ?? m.productId;
  const prev = Number(ex?.stockedKg) || 0;
  const w = Number(m.weightKg);
  if (!m.deleted && !(w > 0)) return { error: 'invalide' };
  const target = m.deleted ? 0 : w;
  const out = { ...rec, productId, stockedKg: prev };
  if (target === prev) return { rec: out };
  if ((await storage.adjustStock(m.cooperativeId, productId, target - prev)) === null) return { error: 'stock-appro' };
  await move(s, m.cooperativeId, productId, target - prev, ex ? 'correction approvisionnement' : 'approvisionnement', { supplyId: m.id });
  return { rec: { ...out, stockedKg: target } };
}

app.post('/api/sync', h(async (req, res) => {
  const a = await auth(req);
  if (a.invalid || a.inactive) return deny(res, a); // le client garde sa file d'attente et redemande une connexion
  const s = a.s;
  const { changes = [], since = 0 } = req.body || {};
  const serverNow = Date.now();
  const reasons = [];
  const corrections = new Map(); // version serveur renvoyée de force quand une modification est refusée ou périmée
  for (const { collection, record: raw } of changes) {
    if (!COLLECTIONS.includes(collection) || !raw?.id) { reasons.push('invalide'); continue; }
    // L'horloge d'un appareil ne peut jamais dépasser celle du serveur : un téléphone « en avance » ne gagne pas tous les conflits.
    const record = { ...raw, updatedAt: Math.min(Number(raw.updatedAt) || serverNow, serverNow), ...(raw.createdAt ? { createdAt: Math.min(Number(raw.createdAt), serverNow) } : {}) };
    const key = `${collection}:${record.id}`;
    const ex = await storage.getRecord(collection, record.id);
    const back = () => ex && corrections.set(key, { collection, record: ex, force: true });
    if (ex && ex.updatedAt > record.updatedAt) { back(); continue; }
    if (collection === 'kudos' && !ex && s?.role === 'gestionnaire') {
      const to = String(record.toCooperativeId || '');
      if (to === s.cooperativeId || !(await storage.getRecord('cooperatives', to))) { reasons.push('invalide'); continue; }
      const day = new Date(serverNow); day.setUTCHours(0, 0, 0, 0);
      const sentToday = (await storage.listSince(day.getTime() - 1)).filter((x) => x.collection === 'kudos' && x.record.fromCooperativeId === s.cooperativeId && x.record.serverAt >= day.getTime()).length;
      if (sentToday >= 5) { reasons.push('limite'); continue; } // 5 messages par coopérative et par jour (GMT)
    }
    let rec = authorize(s, collection, record, ex);
    if (!rec || typeof rec === 'string') { reasons.push(rec || 'droits'); back(); continue; }
    const stockStep = collection === 'orders' ? applyOrderStock : collection === 'supplies' ? applySupplyStock : null;
    if (stockStep) {
      const out = await stockStep(s, rec, ex);
      if (out.error) { reasons.push(out.error); back(); continue; }
      rec = out.rec;
    }
    corrections.delete(key);
    await storage.upsertRecord(collection, rec);
    // Notifications en arrière-plan : un échec d'envoi ne bloque jamais la synchronisation.
    if (collection === 'orders') notifier.onOrderChange(ex, { ...ex, ...rec }).catch((e) => console.error('[notify]', e));
  }
  const all = await storage.listSince(Number(since) || 0);
  const records = all.filter((x) => canRead(s, x.collection, x.record)).map((x) => project(s, x));
  const extra = [...corrections.values()].filter((x) => canRead(s, x.collection, x.record)).map((x) => project(s, x));
  res.json({ records: [...records, ...extra], now: Date.now(), rejected: reasons.length, reasons });
}));

// ---- Inventaire : l'administrateur fixe le stock d'une coopérative (la différence est tracée dans les mouvements)
app.post('/api/stocks', need('administrateur'), h(async (req, res) => {
  const { cooperativeId, productId } = req.body || {};
  const target = Number(req.body?.stockKg);
  if (!cooperativeId || !productId || !(target >= 0) || !(await storage.getRecord('cooperatives', cooperativeId))) return res.status(400).json({ error: 'invalid' });
  const cur = Number((await storage.getRecord('stocks', `${cooperativeId}__${productId}`))?.stockKg) || 0;
  if (target !== cur) {
    if ((await storage.adjustStock(cooperativeId, productId, target - cur)) === null) return res.status(400).json({ error: 'invalid' });
    await move(req.s, cooperativeId, productId, target - cur, 'inventaire');
  }
  res.json({ stockKg: target });
}));

// ---- Classement des coopératives (public : volumes agrégés uniquement, jamais de prix)
const PERIODS = { 7: 7, 30: 30, 90: 90, all: null };
const sum = (a) => a.reduce((x, y) => x + y, 0);
const lbCache = new Map();

async function leaderboard(period) {
  const hit = lbCache.get(period);
  if (hit && Date.now() - hit.t < 30000) return hit.data;
  const days = PERIODS[period];
  const nowMs = Date.now();
  const cutDate = days ? new Date(nowMs - days * 864e5).toISOString().slice(0, 10) : '0000-00-00';
  const cutTs = days ? nowMs - days * 864e5 : 0;
  const all = await storage.listSince(0);
  const live = (c) => all.filter((x) => x.collection === c && !x.record.deleted).map((x) => x.record);
  const supplies = live('supplies').filter((x) => x.date >= cutDate);
  const sales = live('orders').filter((o) => o.stockApplied && o.validatedAt >= cutTs);
  const producers = live('producers').filter((p) => p.validated);

  const rows = live('cooperatives').map((c) => {
    const mine = supplies.filter((x) => x.cooperativeId === c.id);
    const collectedKg = sum(mine.map((x) => Number(x.weightKg) || 0));
    const n = producers.filter((p) => p.cooperativeId === c.id).length;
    return {
      id: c.id, name: c.name, region: c.region, department: c.department, producers: n, collectedKg,
      perProducerKg: n ? Math.round(collectedKg / n) : 0,
      soldKg: sum(sales.flatMap((o) => (o.stockAllocations || []).filter((a) => a.cooperativeId === c.id).map((a) => a.quantityKg))),
      deliveries: sales.filter((o) => (o.stockAllocations || []).some((a) => a.cooperativeId === c.id)).length,
      activeDays: new Set(mine.map((x) => x.date)).size
    };
  });
  // Score global : moyenne de quatre critères ramenés à 100 (volume, productivité par producteur, ventes, régularité),
  // pour que les petites coopératives puissent aussi briller.
  const max = (k) => Math.max(0, ...rows.map((r) => r[k]));
  const M = { volume: max('collectedKg'), productivity: max('perProducerKg'), sales: max('soldKg'), regularity: max('activeDays') };
  const pct = (v, m) => (m ? Math.round((v / m) * 100) : 0);
  for (const r of rows) {
    r.parts = { volume: pct(r.collectedKg, M.volume), productivity: pct(r.perProducerKg, M.productivity), sales: pct(r.soldKg, M.sales), regularity: pct(r.activeDays, M.regularity) };
    r.score = Math.round(sum(Object.values(r.parts)) / 4);
  }
  rows.sort((a, b) => b.score - a.score || b.collectedKg - a.collectedKg).forEach((r, i) => { r.rank = i + 1; });

  const regions = [...new Set(rows.map((r) => r.region))].map((name) => {
    const m = rows.filter((r) => r.region === name);
    const collectedKg = sum(m.map((r) => r.collectedKg));
    const n = sum(m.map((r) => r.producers));
    return { id: name, name, cooperatives: m.length, producers: n, collectedKg, perProducerKg: n ? Math.round(collectedKg / n) : 0, soldKg: sum(m.map((r) => r.soldKg)), activeDays: Math.round(sum(m.map((r) => r.activeDays)) / m.length), score: Math.round(sum(m.map((r) => r.score)) / m.length) };
  });
  const data = {
    period, generatedAt: nowMs,
    union: { cooperatives: rows.length, producers: sum(rows.map((r) => r.producers)), collectedKg: sum(rows.map((r) => r.collectedKg)), soldKg: sum(rows.map((r) => r.soldKg)), jointOrders: sales.filter((o) => (o.stockAllocations || []).length > 1).length },
    cooperatives: rows, regions
  };
  lbCache.set(period, { t: Date.now(), data });
  return data;
}

app.get('/api/leaderboard', h(async (req, res) => {
  res.json(await leaderboard(req.query.period in PERIODS ? req.query.period : '30'));
}));

const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist));
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));

// Rappels automatiques (seulement si un canal est configuré).
const st = notifier.status();
if (st.email || st.sms) {
  const every = Number(process.env.REMINDER_CHECK_MINUTES || 15) * 60000;
  setInterval(() => notifier.runReminders().catch((e) => console.error('[rappels]', e)), every).unref();
  console.log(`Rappels actifs : e-mail=${st.email || 'non'} sms=${st.sms || 'non'} (1er rappel après ${st.afterHours} h, puis toutes les ${st.repeatHours} h, ${st.max} au plus, heures calmes GMT ${st.quiet})`);
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Green System [${process.env.STORAGE || 'json'}] : http://localhost:${port}`));
