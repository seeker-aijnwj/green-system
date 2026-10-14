import Seo from '../../components/Seo.jsx';
import OrdersBoard from '../shared/OrdersBoard.jsx';
import { useApp } from '../../context/AppContext.jsx';
import NotifyHint from '../../components/NotifyHint.jsx';

export default function AgentSpace() {
  const { user, live } = useApp();
  const orders = live('orders');
  const count = (s) => orders.filter((o) => o.status === s).length;
  return (
    <div className="page">
      <Seo title="Espace agent commercial" path="/espace-agent" noindex description="Négociation des commandes." />
      <h1>Bonjour {user.name}</h1>
      <NotifyHint />
      <ul className="stats">
        <li><strong>{count('nouveau')}</strong>nouvelles commandes</li>
        <li><strong>{count('en négociation')}</strong>en négociation</li>
        <li><strong>{count('validée')}</strong>validées</li>
        <li><strong>{count('refusée')}</strong>refusées</li>
      </ul>
      <h2>Commandes à négocier</h2>
      <p className="note">Fixez le prix d'achat avec le client puis validez la vente. Vous pouvez modifier le prix et le statut ; les autres informations restent protégées.</p>
      <OrdersBoard />
      <h2>Stocks disponibles</h2>
      <ul className="list">
        {live('products').map((p) => <li key={p.id}><span>{p.name}</span><span>{p.stockKg ?? 0} kg</span></li>)}
      </ul>
    </div>
  );
}
