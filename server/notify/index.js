// Notifications et rappels (e-mail / SMS), optionnels et choisis par chaque utilisateur dans son profil.
import { MESSAGES } from './messages.js';
import { emailProvider, smsProvider } from './providers.js';
import { gsmSafe, inQuiet, maskEmail, maskPhone, validEmail, validPhone } from './util.js';

const OPEN = ['nouveau', 'en négociation'];
const sum = (a) => a.reduce((t, x) => t + (Number(x.quantityKg) || 0), 0);
const allAccepted = (o) => (o.allocations || []).length > 0 && o.allocations.every((a) => o.confirmations?.[a.cooperativeId]?.status === 'accepted');
const ready = (o) => allAccepted(o) && sum(o.allocations) === Number(o.quantityKg);

export function createNotifier(storage, { coopSees = () => [] } = {}) {
  const cfg = () => ({
    afterHours: Number(process.env.REMINDER_AFTER_HOURS ?? 24),
    repeatHours: Number(process.env.REMINDER_REPEAT_HOURS ?? 48),
    max: Number(process.env.REMINDER_MAX ?? 3),
    quiet: process.env.QUIET_HOURS ?? '20-7'
  });
  const providers = () => ({ email: emailProvider(), sms: smsProvider() });
  const status = () => { const p = providers(); return { email: p.email?.kind ?? null, sms: p.sms?.kind ?? null, ...cfg() }; };

  /** Canaux réellement utilisables pour un utilisateur : fournisseur actif + choix de l'utilisateur + coordonnée valide. */
  const channelsOf = (user, p = providers()) => [
    p.email && user.notify?.email && validEmail(user.email) ? 'email' : null,
    p.sms && user.notify?.sms && validPhone(user.phone) ? 'sms' : null
  ].filter(Boolean);

  /** Envoie un message sur chaque canal choisi. `id` rend l'envoi idempotent : un message déjà parti n'est jamais renvoyé. */
  async function deliver(user, type, ctx, id) {
    const p = providers();
    const out = [];
    for (const channel of channelsOf(user, p)) {
      const rid = `${id}:${user.matricule}:${channel}`;
      if ((await storage.getRecord('notifications', rid))?.status === 'sent') continue;
      const msg = MESSAGES[type]({ ...ctx, name: user.name || '' });
      const to = channel === 'email' ? user.email : user.phone;
      let state = 'sent';
      let error = null;
      try {
        if (channel === 'email') await p.email.send({ to, subject: msg.subject, text: msg.text });
        else await p.sms.send({ to, text: gsmSafe(msg.sms) });
      } catch (e) {
        state = 'failed';
        error = String(e.message || e).slice(0, 200);
        console.warn(`[notify] échec ${channel} → ${channel === 'email' ? maskEmail(to) : maskPhone(to)} : ${error}`);
      }
      const t = Date.now();
      await storage.upsertRecord('notifications', {
        id: rid, type, orderId: ctx.orderId ?? null, cooperativeId: ctx.cooperativeId ?? null, quantityKg: ctx.kg ?? null, rank: ctx.rank ?? null,
        user: user.matricule, channel, to: channel === 'email' ? maskEmail(to) : maskPhone(to), status: state, error, createdAt: t, updatedAt: t
      });
      out.push({ channel, status: state });
    }
    return out;
  }

  const users = async () => (await storage.listUsers()).filter((u) => u.active !== false);
  const coopUsers = async (id) => (await users()).filter((u) => u.role === 'gestionnaire' && u.cooperativeId === id);
  const agents = async () => (await users()).filter((u) => u.role === 'agent');
  const toAll = async (list, ...args) => (await Promise.all(list.map((u) => deliver(u, ...args)))).flat();
  const nameOf = async (collection, id, fallback) => (await storage.getRecord(collection, id))?.name || fallback;

  return {
    status,
    channelsOf,

    /** Réagit à une modification de commande : part proposée, refus, accord complet, vente validée. */
    async onOrderChange(prev, next) {
      const product = await nameOf('products', next.productId, 'produit');
      const base = { orderId: next.id, product, qty: next.quantityKg };
      if (OPEN.includes(next.status) && !next.deleted && !next.stockApplied) {
        for (const a of next.allocations || []) {
          if (!next.confirmations?.[a.cooperativeId])
            await toAll(await coopUsers(a.cooperativeId), 'share.proposed', { ...base, cooperativeId: a.cooperativeId, kg: a.quantityKg }, `share.proposed:${next.id}:${a.cooperativeId}:${a.quantityKg}`);
        }
        for (const [cid, c] of Object.entries(next.confirmations || {})) {
          if (c.status === 'declined' && prev?.confirmations?.[cid]?.at !== c.at)
            await toAll(await agents(), 'share.declined', { ...base, cooperativeId: cid, kg: c.quantityKg, reason: c.reason, coop: await nameOf('cooperatives', cid, cid) }, `share.declined:${next.id}:${cid}:${c.at}`);
        }
        if (ready(next) && !(prev && ready(prev)))
          await toAll(await agents(), 'order.ready', { ...base, company: next.company || next.clientId }, `order.ready:${next.id}:${Math.max(...Object.values(next.confirmations).map((c) => c.at || 0))}`);
      }
      if (next.stockApplied && !prev?.stockApplied) {
        const price = coopSees().includes('price') ? next.price : null;
        for (const a of next.stockAllocations || [])
          await toAll(await coopUsers(a.cooperativeId), 'order.validated.coop', { ...base, cooperativeId: a.cooperativeId, kg: a.quantityKg, price }, `order.validated:${next.id}:${next.validatedAt}`);
        const client = await storage.getUser(next.clientId);
        if (client && client.active !== false) await deliver(client, 'order.validated.client', { ...base, price: next.price }, `order.validated.client:${next.id}:${next.validatedAt}`);
      }
    },

    async clientApproved(user) { return deliver(user, 'client.approved', {}, `client.approved:${user.matricule}:${Date.now()}`); },
    async test(user) { return deliver(user, 'test', {}, `test:${Date.now()}`); },

    /** Rappelle les coopératives qui n'ont pas répondu : après `afterHours`, puis toutes les `repeatHours`, `max` fois au plus,
     *  jamais pendant les heures calmes (GMT). */
    async runReminders() {
      const p = providers();
      const c = cfg();
      if (!p.email && !p.sms) return { disabled: true, sent: 0, failed: 0, checked: 0 };
      if (inQuiet(new Date().getUTCHours(), c.quiet)) return { quiet: true, sent: 0, failed: 0, checked: 0 };
      const all = await storage.listSince(0);
      const live = (col) => all.filter((x) => x.collection === col && !x.record.deleted).map((x) => x.record);
      const orders = live('orders').filter((o) => OPEN.includes(o.status) && !o.stockApplied);
      const notes = live('notifications');
      const people = await users();
      const productNames = new Map(live('products').map((x) => [x.id, x.name]));
      let sent = 0, failed = 0, checked = 0;

      for (const o of orders) {
        for (const a of o.allocations || []) {
          if (o.confirmations?.[a.cooperativeId]?.quantityKg === a.quantityKg) continue; // déjà répondu
          const same = (n, type) => n.type === type && n.orderId === o.id && n.cooperativeId === a.cooperativeId && n.quantityKg === a.quantityKg;
          for (const user of people.filter((u) => u.role === 'gestionnaire' && u.cooperativeId === a.cooperativeId)) {
            for (const channel of channelsOf(user, p)) {
              checked++;
              const mine = (type) => notes.filter((n) => same(n, type) && n.user === user.matricule && n.channel === channel);
              const reminders = mine('share.reminder');
              const done = reminders.filter((n) => n.status === 'sent').length;
              if (done >= c.max) continue;
              const proposedAt = mine('share.proposed')[0]?.createdAt ?? o.updatedAt;
              const last = Math.max(0, ...reminders.map((n) => n.createdAt));
              if (Date.now() < (last || proposedAt) + (last ? c.repeatHours : c.afterHours) * 3600e3) continue;
              const rank = done + 1;
              const res = await deliver({ ...user, notify: { email: channel === 'email', sms: channel === 'sms' } }, 'share.reminder',
                { orderId: o.id, cooperativeId: a.cooperativeId, kg: a.quantityKg, product: productNames.get(o.productId) || 'produit', rank, max: c.max, proposedAt },
                `share.reminder:${o.id}:${a.cooperativeId}:${a.quantityKg}:${rank}`);
              res.forEach((r) => (r.status === 'sent' ? sent++ : failed++));
            }
          }
        }
      }
      return { sent, failed, checked };
    }
  };
}
