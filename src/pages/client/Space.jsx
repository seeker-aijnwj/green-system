import { useState } from 'react';
import Seo from '../../components/Seo.jsx';
import Field from '../../components/Field.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { fmtDate } from '../../lib/clock.js';

export default function ClientSpace() {
  const { user, live, upsert, online } = useApp();
  const products = live('products');
  const orders = live('orders').filter((o) => o.clientId === user.matricule).sort((a, b) => b.createdAt - a.createdAt);
  const [done, setDone] = useState(false);
  const pname = (id) => products.find((p) => p.id === id)?.name || '—';

  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await upsert('orders', {
      productId: f.productId, preferredCooperativeId: f.preferredCooperativeId || null, quantityKg: Number(f.quantityKg), note: f.note,
      status: 'nouveau', price: null, clientId: user.matricule, company: user.company || user.name
    });
    e.currentTarget.reset();
    setDone(true);
  }

  return (
    <div className="page">
      <Seo title="Espace client" path="/espace-client" noindex description="Vos bons de commande." />
      <h1>{user.company || user.name}</h1>
      <p>Statut : <span className={user.approved ? 'tag ok' : 'tag'}>{user.approved ? 'Client agréé' : 'Agrément en attente'}</span></p>

      {!user.approved ? (
        <p className="note warn">
          Votre demande d'agrément est en cours d'examen 
          par l'administration de l'USCAEP. Vous pourrez 
          passer commande dès qu'elle sera validée 
          (connectez-vous à Internet pour actualiser votre 
          statut).
        </p>
      ) : (
        <>
          <h2>Nouveau bon de commande</h2>
          {!online && <p className="note warn">Hors connexion : la commande sera envoyée automatiquement au retour du réseau.</p>}
          {done && <p className="note ok" role="status">Commande enregistrée. Un agent commercial vous contactera pour négocier le prix.</p>}
          <form className="form" onSubmit={submit}>
            <Field label="Produit" id="productId" as="select" required defaultValue="">
              <option value="" disabled>Choisir</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Field>
            <Field label="Quantité (kg)" id="quantityKg" type="number" min="1" required inputMode="numeric" />
            <Field label="Coopérative souhaitée (facultatif)" id="preferredCooperativeId" as="select" defaultValue="">
              <option value="">Au choix de l'union</option>
              {live('cooperatives').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Field>
            <Field label="Précisions (livraison, délais…)" id="note" />
            <button className="btn" type="submit">Envoyer</button>
          </form>
        </>
      )}

      <h2>Mes commandes</h2>
      {orders.length === 0 ? <p className="empty">Aucune commande.</p> : (
        <div className="scroll"><table>
          <thead><tr><th>Date</th><th>Produit</th><th>Qté (kg)</th><th>Prix (FCFA/kg)</th><th>Statut</th><th>Livraison</th></tr></thead>
          <tbody>{orders.map((o) => (
            <tr key={o.id}><td>{fmtDate(o.createdAt)}</td><td>{pname(o.productId)}</td><td>{o.quantityKg}</td><td>{o.price ?? '—'}</td><td>{o.status}</td>
              <td>{o.stockApplied ? <small>Livrée ensemble par {(o.stockAllocations || []).map((a) => `${(live('cooperatives').find((c) => c.id === a.cooperativeId)?.name || '').replace('Coopérative ', '')} (${a.quantityKg.toLocaleString('fr-FR')} kg)`).join(', ')}</small> : '—'}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
