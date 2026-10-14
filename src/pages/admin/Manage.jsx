import { useState } from 'react';
import Seo from '../../components/Seo.jsx';
import Field from '../../components/Field.jsx';
import { useApp } from '../../context/AppContext.jsx';

export default function AdminManage() {
  const { user, live, upsert, remove, online } = useApp();
  const [msg, setMsg] = useState({ type: '', text: '' });
  const coops = live('cooperatives');
  const products = live('products');
  const stocks = live('stocks');

  const form = (collection) => async (e) => {
    e.preventDefault();
    await upsert(collection, Object.fromEntries(new FormData(e.currentTarget)));
    e.currentTarget.reset();
  };
  const del = (c, id, name) => window.confirm(`Supprimer « ${name} » ?`) && remove(c, id);

  /** Inventaire : fixe le stock d'une coopérative (en ligne). La différence est tracée dans les mouvements de stock. */
  async function setStock(coopId, productId, value) {
    try {
      const r = await fetch('/api/stocks', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ cooperativeId: coopId, productId, stockKg: Number(value) })
      });
      if (!r.ok) throw new Error();
      setMsg({ type: 'ok', text: 'Inventaire enregistré.' });
    } catch { setMsg({ type: 'warn', text: "Inventaire refusé : vérifiez la valeur et la connexion Internet." }); }
  }

  return (
    <div className="page">
      <Seo title="Gestion" path="/administration/gestion" noindex description="Gestion des coopératives, produits, inventaire et messages." />
      <h1>Gestion</h1>

      <h2>Coopératives</h2>
      <form className="form" onSubmit={form('cooperatives')}>
        <Field label="Nom" id="name" required /><Field label="Région" id="region" required /><Field label="Département" id="department" required />
        <button className="btn" type="submit">Ajouter</button>
      </form>
      <ul className="list">{coops.map((c) => (
        <li key={c.id}><span>{c.name} <small className="text-stone-500">{c.region} · {c.department}</small></span><button type="button" className="link" onClick={() => del('cooperatives', c.id, c.name)}>Supprimer</button></li>
      ))}</ul>

      <h2>Produits (vitrine publique)</h2>
      <form className="form" onSubmit={form('products')}>
        <Field label="Nom" id="name" required /><Field label="Description" id="description" />
        <button className="btn" type="submit">Ajouter</button>
      </form>
      <ul className="list">{products.map((p) => (
        <li key={p.id}><span>{p.name} <small className="text-stone-500">total union : {(Number(p.stockKg) || 0).toLocaleString('fr-FR')} kg</small></span><button type="button" className="link" onClick={() => del('products', p.id, p.name)}>Supprimer</button></li>
      ))}</ul>

      <h2>Inventaire par coopérative (kg)</h2>
      <p className="note">Le stock évolue tout seul (approvisionnements, ventes). Utilisez l'inventaire pour corriger un écart constaté sur le terrain ; chaque correction est tracée.</p>
      {!online && <p className="note warn">Hors connexion : l'inventaire nécessite Internet.</p>}
      {msg.text && <p className={`note ${msg.type}`} role="status">{msg.text}</p>}
      <div className="scroll">
        <table>
          <thead><tr><th>Coopérative</th>{products.map((p) => <th key={p.id}>{p.name}</th>)}</tr></thead>
          <tbody>{coops.map((c) => (
            <tr key={c.id}><td>{c.name}</td>
              {products.map((p) => {
                const kg = Number(stocks.find((s) => s.cooperativeId === c.id && s.productId === p.id)?.stockKg) || 0;
                return <td key={p.id}><input type="number" min="0" className="w-28" aria-label={`Stock ${p.name} ${c.name}`} disabled={!online}
                  defaultValue={kg} key={kg} onBlur={(e) => Number(e.target.value) !== kg && setStock(c.id, p.id, e.target.value)} /></td>;
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>

      <h2>Mur d'entraide (modération)</h2>
      <p className="note">Les messages entre coopératives sont visibles de toute l'union. Supprimez tout message inapproprié.</p>
      {live('kudos').length === 0 && <p className="empty">Aucun message d'entraide.</p>}
      <ul className="list">{live('kudos').sort((a, b) => b.createdAt - a.createdAt).slice(0, 20).map((k) => {
        const cn = (id) => coops.find((c) => c.id === id)?.name.replace('Coopérative ', '') || id;
        return <li key={k.id}><span><strong>{cn(k.fromCooperativeId)} → {cn(k.toCooperativeId)}</strong> : {k.message}</span><button type="button" className="link" onClick={() => window.confirm('Supprimer ce message ?') && remove('kudos', k.id)}>Supprimer</button></li>;
      })}</ul>

      <h2>Messages reçus</h2>
      {live('messages').length === 0 && <p className="empty">Aucun message.</p>}
      <ul className="list">{live('messages').map((m) => (
        <li key={m.id}><span><strong>{m.name}</strong> ({m.email}) — {m.body}</span></li>
      ))}</ul>
    </div>
  );
}
