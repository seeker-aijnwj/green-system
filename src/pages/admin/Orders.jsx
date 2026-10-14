import Seo from '../../components/Seo.jsx';
import OrdersBoard from '../shared/OrdersBoard.jsx';

export default function AdminOrders() {
  return (
    <div className="page">
      <Seo title="Commandes" path="/administration/commandes" noindex description="Suivi des bons de commande." />
      <h1>Bons de commande</h1>
      <OrdersBoard />
    </div>
  );
}
