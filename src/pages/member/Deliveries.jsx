import { HeartHandshake, PartyPopper } from 'lucide-react';
import Seo from '../../components/Seo.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { fmtDate, now } from '../../lib/clock.js';
import { PRESETS } from '../../lib/cheers.js';

const SHADES = ['bg-forest-700', 'bg-forest-500', 'bg-forest-300', 'bg-bark-700', 'bg-forest-200', 'bg-forest-600'];
const n = (v) => Number(v || 0).toLocaleString('fr-FR');
const MARK = { accepted: '✓', declined: '✕' };

/** Livraisons communes : accepter sa part, voir celle des autres coopératives, féliciter ses partenaires. */
export default function Deliveries() {
  const { user, live, upsert } = useApp();
  const coops = live('cooperatives');
  const products = live('products');
  const kudos = live('kudos');
  const me = user.cooperativeId;
  const split = (o) => (o.stockApplied ? o.stockAllocations : o.allocations) || [];
  const orders = live('orders').filter((o) => split(o).some((a) => a.cooperativeId === me)).sort((a, b) => (b.validatedAt || b.createdAt) - (a.validatedAt || a.createdAt));
  const done = orders.filter((o) => o.stockApplied);
  const share = (o) => split(o).find((a) => a.cooperativeId === me)?.quantityKg || 0;
  const cname = (id) => coops.find((c) => c.id === id)?.name.replace('Coopérative ', '') || id;
  const partners = new Set(done.flatMap((o) => split(o).map((a) => a.cooperativeId)).filter((id) => id !== me));
  const revenue = done.reduce((t, o) => t + share(o) * (Number(o.price) || 0), 0);
  const open = (o) => !o.stockApplied && ['nouveau', 'en négociation'].includes(o.status);
  const waiting = orders.filter((o) => open(o) && !o.confirmations?.[me]);

  function answer(o, status) {
    let reason = '';
    if (status === 'declined') {
      reason = window.prompt('Pourquoi refusez-vous cette part ? (stock déjà réservé, récolte en retard…)');
      if (reason === null) return;
    }
    const entry = { status, quantityKg: share(o), reason: reason.trim() };
    upsert('orders', { id: o.id, confirmation: entry, confirmations: { ...(o.confirmations || {}), [me]: { ...entry, at: now(), by: user.matricule } } });
  }
  const congratulated = (o, to) => kudos.some((k) => k.fromCooperativeId === me && k.toCooperativeId === to && k.orderId === o.id);
  const congratulate = (o, to) => upsert('kudos', { kind: 'felicitations', toCooperativeId: to, orderId: o.id, message: PRESETS.felicitations[0], fromCooperativeId: me });

  return (
    <div className="page">
      <Seo title="Livraisons" path="/espace-membre/livraisons" noindex description="Commandes livrées ensemble par les coopératives." />
      <h1>Livraisons communes</h1>
      <p className="max-w-2xl text-stone-600">Les grosses commandes se livrent ensemble : chaque coopérative apporte sa part selon son stock, et doit l'accepter avant que la vente soit validée.</p>

      {waiting.length > 0 && <p className="note warn" role="status"><strong>{waiting.length} part(s) attendent votre réponse.</strong> La vente ne peut être validée qu'une fois toutes les coopératives d'accord.</p>}

      <ul className="stats">
        <li><strong>{done.length}</strong>commandes livrées</li>
        <li><strong>{n(done.reduce((t, o) => t + share(o), 0))}</strong>kg apportés</li>
        <li><strong>{partners.size}</strong>coopératives partenaires</li>
        <li><strong>{revenue ? n(revenue) : '—'}</strong>FCFA (estimation)</li>
      </ul>
      {done.length > 0 && (
        <p className="note flex items-start gap-2"><HeartHandshake className="mt-0.5 size-5 shrink-0 text-forest-600" aria-hidden="true" />
          Ensemble avec {partners.size} autre(s) coopérative(s), vous avez honoré {done.length} commande(s). Merci à chacune pour sa part !</p>
      )}

      {orders.length === 0 && <p className="empty">Aucune commande ne vous est encore attribuée. Un stock bien approvisionné augmente vos chances d'être sollicités.</p>}
      <ul className="grid list-none gap-4 p-0">
        {orders.map((o) => {
          const parts = split(o);
          const total = parts.reduce((t, a) => t + a.quantityKg, 0) || 1;
          const p = products.find((x) => x.id === o.productId);
          const mine = o.confirmations?.[me];
          const others = parts.filter((a) => a.cooperativeId !== me);
          const todo = others.filter((a) => !congratulated(o, a.cooperativeId));
          return (
            <li key={o.id} className={`card ${open(o) && !mine ? 'ring-2 ring-sun-500' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-lg">{p?.name} · {n(o.quantityKg)} kg</strong>
                <span className={`tag ${o.stockApplied ? 'ok' : ''}`}>{o.stockApplied ? `Livrée le ${fmtDate(o.validatedAt)}` : `En préparation (${o.status})`}</span>
              </div>
              <p className="mt-1 text-sm text-stone-600">
                Ma part : <strong className="text-forest-700">{n(share(o))} kg</strong> ({Math.round((share(o) / total) * 100)} %)
                {o.price ? <> · prix {n(o.price)} FCFA/kg · <strong>{n(share(o) * o.price)} FCFA</strong></> : o.price === undefined ? '' : ' · prix en cours de négociation'}
                {o.company && <> · client : {o.company}</>}
              </p>
              <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-forest-50" role="img" aria-label="Répartition entre coopératives">
                {parts.map((a, i) => <span key={a.cooperativeId} className={a.cooperativeId === me ? 'bg-sun-500' : SHADES[i % SHADES.length]} style={{ width: `${(a.quantityKg / total) * 100}%` }} />)}
              </div>
              <ul className="mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-stone-600">
                {parts.map((a, i) => {
                  const c = o.confirmations?.[a.cooperativeId];
                  return (
                    <li key={a.cooperativeId} className="flex items-center gap-1.5">
                      <span className={`size-2.5 rounded-full ${a.cooperativeId === me ? 'bg-sun-500' : SHADES[i % SHADES.length]}`} />
                      <span className={a.cooperativeId === me ? 'font-bold text-bark-900' : ''}>{cname(a.cooperativeId)} · {n(a.quantityKg)} kg {MARK[c?.status] || '…'}</span>
                    </li>
                  );
                })}
              </ul>
              {open(o) && (
                <div className="mt-4 border-t border-forest-100 pt-3">
                  {mine?.status === 'accepted' && <p className="note ok m-0">Vous avez accepté votre part de {n(share(o))} kg. Merci !</p>}
                  {mine?.status === 'declined' && <p className="note warn m-0">Vous avez refusé cette part{mine.reason ? ` (« ${mine.reason} »)` : ''}. L'agent va proposer une autre répartition.</p>}
                  {!mine && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-auto text-sm font-semibold">Pouvez-vous livrer {n(share(o))} kg ?</span>
                      <button type="button" className="btn" onClick={() => answer(o, 'accepted')}>Accepter ma part</button>
                      <button type="button" className="btn dark" onClick={() => answer(o, 'declined')}>Refuser</button>
                    </div>
                  )}
                  {mine && <button type="button" className="link mt-2 text-sm" onClick={() => answer(o, mine.status === 'accepted' ? 'declined' : 'accepted')}>Changer ma réponse</button>}
                </div>
              )}
              {o.stockApplied && others.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-forest-100 pt-3">
                  <PartyPopper className="size-5 text-sun-600" aria-hidden="true" />
                  {todo.length === 0 ? <span className="tag ok">Félicitations envoyées à tous vos partenaires</span> : (
                    <>
                      {todo.map((a) => <button key={a.cooperativeId} type="button" className="btn small" onClick={() => congratulate(o, a.cooperativeId)}>Féliciter {cname(a.cooperativeId)}</button>)}
                      {todo.length > 1 && <button type="button" className="btn dark small" onClick={() => todo.forEach((a) => congratulate(o, a.cooperativeId))}>Féliciter tout le monde</button>}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
