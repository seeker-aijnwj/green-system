import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import Seo from '../../components/Seo.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useLeaderboard } from '../../lib/useLeaderboard.js';
import { unreadFor } from '../../lib/cheers.js';
import { fmtDate } from '../../lib/clock.js';
import NotifyHint from '../../components/NotifyHint.jsx';

const PARTS = { volume: 'Volume collecté', productivity: 'Productivité', sales: 'Ventes', regularity: 'Régularité' };

export default function MemberDashboard() {
  const { user, live } = useApp();
  const { data: lb } = useLeaderboard('30');
  const mine = (c) => live(c).filter((x) => x.cooperativeId === user.cooperativeId);
  const coop = live('cooperatives').find((c) => c.id === user.cooperativeId);
  const supplies = mine('supplies');
  const products = live('products');
  const stocks = mine('stocks');
  const byDay = {};
  supplies.forEach((s) => { byDay[s.date] = (byDay[s.date] || 0) + Number(s.weightKg); });
  const days = Object.entries(byDay).sort().slice(-7);
  const max = Math.max(1, ...days.map(([, v]) => v));
  const share = (o) => ((o.stockApplied ? o.stockAllocations : o.allocations) || []).find((a) => a.cooperativeId === user.cooperativeId)?.quantityKg || 0;
  const myOrders = live('orders').filter((o) => share(o) > 0);
  const pendingShare = myOrders.filter((o) => !o.stockApplied);
  const toAnswer = pendingShare.filter((o) => ['nouveau', 'en négociation'].includes(o.status) && !o.confirmations?.[user.cooperativeId]);
  const unread = unreadFor(live('kudos'), user.cooperativeId);
  const me = lb?.cooperatives?.find((c) => c.id === user.cooperativeId);
  const weakest = me && Object.entries(me.parts).sort((a, b) => a[1] - b[1])[0];

  return (
    <div className="page">
      <Seo title="Tableau de bord" path="/espace-membre" noindex description="Tableau de bord de la coopérative." />
      <h1>{coop?.name || 'Ma coopérative'}</h1>
      <NotifyHint />
      <ul className="stats">
        <li><strong>{mine('producers').length}</strong>producteurs</li>
        <li><strong>{mine('employees').length}</strong>employés</li>
        <li><strong>{supplies.length}</strong>approvisionnements</li>
        <li><strong>{stocks.reduce((a, s) => a + (Number(s.stockKg) || 0), 0).toLocaleString('fr-FR')}</strong>kg en stock</li>
      </ul>

      <h2>Le stock de ma coopérative</h2>
      <ul className="cards">
        {products.map((p) => {
          const kg = Number(stocks.find((s) => s.productId === p.id)?.stockKg) || 0;
          return <li key={p.id} className="card"><h2>{p.name}</h2><strong className="text-2xl text-forest-700">{kg.toLocaleString('fr-FR')} kg</strong><p className="text-sm text-stone-500">augmente avec vos approvisionnements, baisse à chaque vente validée</p></li>;
        })}
      </ul>

      {(toAnswer.length > 0 || unread > 0) && (
        <div className="my-4 grid gap-3 sm:grid-cols-2">
          {toAnswer.length > 0 && <Link to="/espace-membre/livraisons" className="note warn m-0 no-underline"><strong>{toAnswer.length} part(s) de commande attendent votre réponse</strong><br />Acceptez ou refusez pour permettre la validation de la vente.</Link>}
          {unread > 0 && <Link to="/espace-membre/entraide" className="note m-0 no-underline"><strong>{unread} nouveau(x) message(s) d'encouragement</strong><br />Lisez ce que les autres coopératives vous ont écrit.</Link>}
        </div>
      )}

      {myOrders.length > 0 && (
        <>
          <h2>Mes livraisons communes</h2>
          <div className="card flex flex-wrap items-center justify-between gap-3">
            <span>
              <strong className="text-lg">{myOrders.filter((o) => o.stockApplied).length} livrée(s)</strong>
              {pendingShare.length > 0 && <span className="tag ml-2">{pendingShare.length} en préparation</span>}
            </span>
            <Link to="/espace-membre/livraisons" className="btn small no-underline">Voir ma part</Link>
          </div>
        </>
      )}

      <h2>Ma place dans le classement</h2>
      {me ? (
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-16 place-items-center rounded-2xl bg-sun-500 text-bark-900"><Trophy className="size-8" aria-hidden="true" /></span>
            <div>
              <strong className="block text-3xl font-extrabold text-forest-700">{me.rank}<sup className="text-base">{me.rank === 1 ? 'er' : 'e'}</sup> <span className="text-base font-semibold text-stone-500">sur {lb.cooperatives.length} · {me.score} pts (30 jours)</span></strong>
              <Link to="/classement" className="text-sm font-bold">Voir le classement complet</Link>
            </div>
          </div>
          <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
            {Object.entries(PARTS).map(([k, label]) => (
              <li key={k}>
                <div className="flex justify-between text-sm"><span>{label}</span><strong>{me.parts[k]}/100</strong></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-forest-50" role="presentation"><div className={`h-full rounded-full ${weakest?.[0] === k ? 'bg-sun-500' : 'bg-forest-500'}`} style={{ width: `${me.parts[k]}%` }} /></div>
              </li>
            ))}
          </ul>
          {weakest && me.rank > 1 && <p className="note mt-4">Pour progresser : travaillez en priorité votre critère « {PARTS[weakest[0]].toLowerCase()} ».</p>}
        </div>
      ) : <p className="empty">Classement indisponible (connexion Internet requise pour la première consultation).</p>}

      <h2>Poids reçu ces 7 derniers jours (kg)</h2>
      {days.length === 0 ? <p className="empty">Aucun approvisionnement enregistré.</p> : (
        <div className="bars" role="img" aria-label="Poids reçu par jour">
          {days.map(([d, v]) => (
            <div key={d} className="bar"><span style={{ height: `${(v / max) * 100}%` }} /><small>{v}</small><em>{fmtDate(Date.parse(d)).slice(0, 5)}</em></div>
          ))}
        </div>
      )}
    </div>
  );
}
