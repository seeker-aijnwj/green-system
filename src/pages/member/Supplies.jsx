import { useState } from 'react';
import Seo from '../../components/Seo.jsx';
import Field from '../../components/Field.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { fmtDate, hourGMT, today } from '../../lib/clock.js';


export default function Supplies() {
  const { user, live, upsert } = useApp();
  const producers = live('producers').filter((p) => p.cooperativeId === user.cooperativeId);
  const products = live('products');
  const supplies = live('supplies').filter((s) => s.cooperativeId === user.cooperativeId).sort((a, b) => b.createdAt - a.createdAt);
  const [error, setError] = useState('');

  async function add(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await upsert('supplies', { ...f, weightKg: Number(f.weightKg), cooperativeId: user.cooperativeId, recordedBy: user.matricule });
    e.currentTarget.reset();
  }

  async function edit(s) {
    const weight = window.prompt('Nouveau poids (kg)', s.weightKg);
    if (weight === null) return;
    const after8pm = hourGMT() >= 20; // heure GMT de confiance
    let justification = s.justification;
    if (after8pm) {
      justification = window.prompt('Modification après 20 h GMT : justification obligatoire');
      if (!justification?.trim()) { setError('Modification annulée : justification obligatoire après 20 h.'); return; }
    }
    setError('');
    await upsert('supplies', { id: s.id, weightKg: Number(weight), justification, modifiedAfter8pm: after8pm || s.modifiedAfter8pm });
  }

  const name = (list, id) => list.find((x) => x.id === id)?.name || '—';

  return (
    <div className="page">
      <Seo title="Approvisionnements" path="/espace-membre/approvisionnements" noindex description="Enregistrement des approvisionnements." />
      <h1>Approvisionnements</h1>
      <form className="form" onSubmit={add}>
        <Field label="Producteur" id="producerId" as="select" required defaultValue="">
          <option value="" disabled>Choisir</option>
          {producers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Field>
        <Field label="Produit" id="productId" as="select" required defaultValue="">
          <option value="" disabled>Choisir</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Field>
        <Field label="Poids (kg)" id="weightKg" type="number" min="1" step="0.1" required inputMode="decimal" />
        <Field label="Date" id="date" type="date" defaultValue={today()} max={today()} required />
        <button className="btn" type="submit">Enregistrer</button>
      </form>
      {error && <p className="note warn" role="alert">{error}</p>}
      <div className="scroll">
        <table>
          <thead><tr><th>Date</th><th>Producteur</th><th>Produit</th><th>Poids (kg)</th><th /></tr></thead>
          <tbody>
            {supplies.map((s) => (
              <tr key={s.id}>
                <td>{fmtDate(Date.parse(s.date))}</td><td>{name(producers, s.producerId)}</td><td>{name(products, s.productId)}</td>
                <td>{s.weightKg}{s.modifiedAfter8pm && ' *'}</td>
                <td><button type="button" className="link" onClick={() => edit(s)}>Modifier</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {supplies.length === 0 && <p className="empty">Aucun approvisionnement.</p>}
      </div>
      <p className="note">* modifié après 20 h GMT, avec justification. Chaque approvisionnement enregistré augmente le stock de votre coopérative.</p>
    </div>
  );
}
