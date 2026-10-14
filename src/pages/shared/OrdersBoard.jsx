import { Fragment, useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { allAccepted, reconcileConfirmations, splitEqual, splitProportional, sumAlloc } from '../../lib/allocation.js';
import { now } from '../../lib/clock.js';

const STATUS = ['nouveau', 'en négociation', 'validée', 'refusée'];
const n = (v) => Number(v || 0).toLocaleString('fr-FR');
const MARK = { accepted: ['✓', 'ok', 'a accepté'], declined: ['✕', 'warn', 'a refusé'] };

/** État de la réponse d'une coopérative à sa part. */
function ConfTag({ name, kg, c }) {
  const [mark, cls, label] = MARK[c?.status] || ['…', '', 'n\'a pas encore répondu'];
  return <span className={`tag ${cls}`} title={`${name} ${label}${c?.reason ? ` : ${c.reason}` : ''}`}>{mark} {name} · {n(kg)} kg<span className="sr-only"> ({label})</span></span>;
}

/** Répartition d'une commande entre plusieurs coopératives, selon leur stock. */
function AllocationPanel({ order, coops, stockOf, onSave, isAdmin, onConfirm }) {
  const caps = Object.fromEntries(coops.map((c) => [c.id, stockOf(c.id, order.productId)]));
  const [vals, setVals] = useState(Object.fromEntries((order.allocations || []).map((a) => [a.cooperativeId, String(a.quantityKg)])));
  const qty = Number(order.quantityKg);
  const num = (id) => Number(vals[id]) || 0;
  const total = coops.reduce((t, c) => t + num(c.id), 0);
  const over = coops.some((c) => num(c.id) > caps[c.id]);
  const fill = (fn) => setVals(Object.fromEntries(Object.entries(fn(qty, caps)).filter(([, v]) => v > 0).map(([k, v]) => [k, String(v)])));
  const complete = total === qty;

  return (
    <div className="rounded-2xl bg-forest-50 p-4">
      <p className="mb-3 text-sm text-forest-900">Chaque coopérative contribue selon son stock : la somme des parts doit égaler <strong>{n(qty)} kg</strong> pour pouvoir valider la vente.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className="btn dark small" onClick={() => fill(splitProportional)}>Proportionnelle au stock</button>
        <button type="button" className="btn dark small" onClick={() => fill(splitEqual)}>Parts égales</button>
        <button type="button" className="btn small" onClick={() => setVals({})}>Effacer</button>
      </div>
      <ul className="grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {coops.map((c) => (
          <li key={c.id} className={`rounded-xl border bg-white p-3 ${num(c.id) > caps[c.id] ? 'border-red-400' : 'border-forest-100'}`}>
            <label htmlFor={`a-${order.id}-${c.id}`} className="block text-sm font-semibold">{c.name}</label>
            <span className="text-xs text-stone-500">stock : {n(caps[c.id])} kg</span>
            <input id={`a-${order.id}-${c.id}`} type="number" min="0" inputMode="numeric" placeholder="0" value={vals[c.id] ?? ''}
              onChange={(e) => setVals({ ...vals, [c.id]: e.target.value })} className="mt-1 w-full" />
            {num(c.id) > caps[c.id] && <span className="text-xs font-semibold text-red-700">Dépasse le stock</span>}
          </li>
        ))}
      </ul>
      {(order.allocations || []).length > 0 && (
        <div className="mt-4 rounded-xl bg-white p-3">
          <strong className="text-sm">Réponses des coopératives à leur part</strong>
          <ul className="mt-2 grid list-none gap-1.5 p-0 text-sm">
            {order.allocations.map((a) => {
              const c = order.confirmations?.[a.cooperativeId];
              const name = coops.find((x) => x.id === a.cooperativeId)?.name.replace('Coopérative ', '') || a.cooperativeId;
              return (
                <li key={a.cooperativeId} className="flex flex-wrap items-center gap-2">
                  <ConfTag name={name} kg={a.quantityKg} c={c} />
                  {c?.reason && <small className="text-stone-500">« {c.reason} »</small>}
                  {c?.onBehalf && <small className="text-stone-500">(accepté par l'administration)</small>}
                  {isAdmin && c?.status !== 'accepted' && order.status !== 'validée' && (
                    <button type="button" className="link text-xs" onClick={() => onConfirm(a)}>Accepter au nom de la coopérative</button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-stone-500">Si vous modifiez une part, la coopérative concernée devra répondre à nouveau.</p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="min-w-40 flex-1">
          <div className="flex justify-between text-sm"><span>Réparti</span><strong className={complete ? 'text-forest-700' : 'text-amber-700'}>{n(total)} / {n(qty)} kg</strong></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white" role="presentation"><div className={`h-full rounded-full ${complete ? 'bg-forest-500' : total > qty ? 'bg-red-500' : 'bg-sun-500'}`} style={{ width: `${Math.min(100, (total / qty) * 100)}%` }} /></div>
        </div>
        <button type="button" className="btn" disabled={over || total > qty}
          onClick={() => onSave(coops.filter((c) => num(c.id) > 0).map((c) => ({ cooperativeId: c.id, quantityKg: num(c.id) })))}>
          Enregistrer la répartition
        </button>
      </div>
    </div>
  );
}

/** Négociation des commandes (agent commercial et administrateur).
 *  Une vente validée débite le stock de chaque coopérative selon sa part. */
export default function OrdersBoard() {
  const { user, live, upsert } = useApp();
  const [open, setOpen] = useState(null);
  const products = live('products');
  const coops = live('cooperatives');
  const stocks = live('stocks');
  const orders = live('orders').sort((a, b) => b.createdAt - a.createdAt);
  const stockOf = (coopId, productId) => Number(stocks.find((s) => s.cooperativeId === coopId && s.productId === productId)?.stockKg) || 0;
  const cname = (id) => coops.find((c) => c.id === id)?.name.replace('Coopérative ', '') || id;

  return (
    <>
      {orders.length === 0 && <p className="empty">Aucune commande reçue.</p>}
      <div className="scroll">
        <table>
          <thead><tr><th>Client</th><th>Produit</th><th>Qté (kg)</th><th>Répartition entre coopératives</th><th>Prix (FCFA/kg)</th><th>Statut</th></tr></thead>
          <tbody>
            {orders.map((o) => {
              const p = products.find((x) => x.id === o.productId);
              const complete = sumAlloc(o.allocations) === Number(o.quantityKg);
              const ready = complete && allAccepted(o);
              const pref = o.preferredCooperativeId && cname(o.preferredCooperativeId);
              return (
                <Fragment key={o.id}>
                  <tr>
                    <td>{o.company}<br /><small className="text-stone-500">{o.clientId}</small>{o.note && <><br /><small>« {o.note} »</small></>}{pref && <><br /><span className="tag">Souhait client : {pref}</span></>}</td>
                    <td>{p?.name || '—'}<br /><small className="text-stone-500">total union : {n(p?.stockKg)} kg</small></td>
                    <td>{n(o.quantityKg)}</td>
                    <td>
                      {(o.allocations || []).length > 0
                        ? <div className="mb-1 flex flex-wrap gap-1">{o.allocations.map((a) => <ConfTag key={a.cooperativeId} name={cname(a.cooperativeId)} kg={a.quantityKg} c={o.confirmations?.[a.cooperativeId]} />)}</div>
                        : <span className="text-stone-500">aucune</span>}
                      {!complete && <span className="tag warn">Répartition incomplète</span>}
                      {complete && !ready && o.status !== 'validée' && <span className="tag">En attente des coopératives</span>}
                      {o.stockApplied && <span className="tag ok">Stock déduit</span>}
                      <button type="button" className="link mt-1 flex items-center gap-1" aria-expanded={open === o.id} onClick={() => setOpen(open === o.id ? null : o.id)}>
                        <Users className="size-4" aria-hidden="true" /> Répartir <ChevronDown className={`size-4 transition ${open === o.id ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <input type="number" min="0" aria-label="Prix par kilo" defaultValue={o.price ?? ''} className="w-28"
                        onBlur={(e) => e.target.value !== String(o.price ?? '') && upsert('orders', { id: o.id, price: Number(e.target.value), status: o.status === 'nouveau' ? 'en négociation' : o.status })} />
                    </td>
                    <td>
                      <select aria-label="Statut" value={o.status} onChange={(e) => upsert('orders', { id: o.id, status: e.target.value })}>
                        {STATUS.map((s) => <option key={s} disabled={s === 'validée' && !ready && o.status !== 'validée'}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                  {open === o.id && (
                    <tr><td colSpan={6} className="bg-white">
                      <AllocationPanel key={JSON.stringify(o.allocations)} order={o} coops={coops} stockOf={stockOf}
                        isAdmin={user.role === 'administrateur'}
                        onConfirm={(a) => upsert('orders', { id: o.id, confirmation: { cooperativeId: a.cooperativeId, status: 'accepted', quantityKg: a.quantityKg }, confirmations: { ...(o.confirmations || {}), [a.cooperativeId]: { status: 'accepted', quantityKg: a.quantityKg, reason: '', at: now(), by: user.matricule, onBehalf: true } } })}
                        onSave={(allocations) => { upsert('orders', { id: o.id, allocations, confirmations: reconcileConfirmations(o.confirmations, allocations) }); setOpen(null); }} />
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
