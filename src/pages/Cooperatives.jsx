import Seo from '../components/Seo.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Cooperatives() {
  const { live } = useApp();
  const coops = live('cooperatives');
  return (
    <div className="page">
      <Seo title="Nos coopératives" path="/cooperatives" description="Liste des coopératives membres de l'USCAEP, par région et département." />
      <h1>Nos coopératives</h1>
      {coops.length === 0 && <p className="empty">Aucune coopérative en mémoire. Connectez-vous à Internet une première fois pour charger la liste.</p>}
      <ul className="cards">
        {coops.map((c) => (
          <li key={c.id} className="card">
            <h2>{c.name}</h2>
            <p>{c.region} · {c.department}</p>
            {c.contact && <p>{c.contact}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
