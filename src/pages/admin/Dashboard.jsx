import Seo from '../../components/Seo.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { fmtDateTime } from '../../lib/clock.js';

export default function AdminDashboard() {
  const { live, upsert } = useApp();
  const coops = live('cooperatives');
  const supplies = live('supplies');
  const orders = live('orders');
  const products = live('products');
  const moves = live('movements').sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
  const low = products.filter((p) => (Number(p.stockKg) || 0) < 1000);
  const stocks = live('stocks');
  const cname = (id) => coops.find((c) => c.id === id)?.name || '—';
  const pname = (id) => products.find((p) => p.id === id)?.name || '—';
  const pending = [...live('producers').map((p) => ({ ...p, kind: 'producers' })), ...live('employees').map((p) => ({ ...p, kind: 'employees' }))].filter((p) => !p.validated);

  return (
    <div className="page">
      <Seo title="Administration" path="/administration" noindex description="Supervision des coopératives." />
      <h1>Supervision de l'union</h1>
      <ul className="stats">
        <li><strong>{coops.length}</strong>coopératives</li>
        <li><strong>{orders.length}</strong>commandes</li>
        <li><strong>{supplies.length}</strong>approvisionnements</li>
        <li><strong>{products.reduce((a, p) => a + (Number(p.stockKg) || 0), 0).toLocaleString('fr-FR')}</strong>kg en stock</li>
      </ul>

      {low.length > 0 && <p className="note warn" role="status"><strong>Stock bas :</strong> {low.map((p) => `${p.name} (${Number(p.stockKg) || 0} kg)`).join(', ')}.</p>}

      <h2>Approvisionnements par coopérative</h2>
      <div className="scroll">
        <table>
          <thead><tr><th>Coopérative</th><th>Opérations</th><th>Total (kg)</th></tr></thead>
          <tbody>
            {coops.map((c) => {
              const s = supplies.filter((x) => x.cooperativeId === c.id);
              return <tr key={c.id}><td>{c.name}</td><td>{s.length}</td><td>{s.reduce((a, x) => a + Number(x.weightKg), 0)}</td></tr>;
            })}
          </tbody>
        </table>
      </div>

      <h2>Stock par coopérative (kg)</h2>
      <div className="scroll">
        <table>
          <thead><tr><th>Coopérative</th>{products.map((p) => <th key={p.id}>{p.name}</th>)}</tr></thead>
          <tbody>
            {coops.map((c) => (
              <tr key={c.id}><td>{c.name}</td>{products.map((p) => <td key={p.id}>{(Number(stocks.find((x) => x.cooperativeId === c.id && x.productId === p.id)?.stockKg) || 0).toLocaleString('fr-FR')}</td>)}</tr>
            ))}
            <tr className="font-bold"><td>Total union</td>{products.map((p) => <td key={p.id}>{(Number(p.stockKg) || 0).toLocaleString('fr-FR')}</td>)}</tr>
          </tbody>
        </table>
      </div>

      <h2>Derniers mouvements de stock</h2>
      {moves.length === 0 ? <p className="empty">Aucun mouvement : le stock change à chaque approvisionnement, vente validée ou inventaire.</p> : (
        <div className="scroll">
          <table>
            <thead><tr><th>Date</th><th>Coopérative</th><th>Produit</th><th>Variation (kg)</th><th>Motif</th><th>Par</th></tr></thead>
            <tbody>{moves.map((m) => (
              <tr key={m.id}>
                <td>{fmtDateTime(m.createdAt)}</td>
                <td>{cname(m.cooperativeId)}</td><td>{pname(m.productId)}</td>
                <td className={m.delta < 0 ? 'font-bold text-red-700' : 'font-bold text-forest-700'}>{m.delta > 0 ? '+' : ''}{m.delta.toLocaleString('fr-FR')}</td>
                <td>{m.reason}</td><td>{m.by}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <h2>Inscriptions à valider</h2>
      {pending.length === 0 ? <p className="empty">Rien à valider.</p> : (
        <ul className="list">
          {pending.map((p) => (
            <li key={p.id}>
              <span>{p.name} <small className="text-stone-500">{p.kind === 'producers' ? 'producteur' : 'employé'}</small></span>
              <button type="button" className="btn small" onClick={() => upsert(p.kind, { id: p.id, validated: true })}>Valider</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
