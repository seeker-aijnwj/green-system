import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { useApp } from '../context/AppContext.jsx';

function Level({ kg, max }) {
  const [label, cls, bar] = kg <= 0 ? ['Épuisé', 'warn', 'bg-red-500'] : kg < 1000 ? ['Stock limité', '', 'bg-sun-500'] : ['Disponible', 'ok', 'bg-forest-500'];
  return (
    <>
      <div className="mt-3 flex items-center justify-between text-sm">
        <strong>{kg.toLocaleString('fr-FR')} kg</strong><span className={`tag ${cls}`}>{label}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-forest-50" role="presentation">
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${Math.max(2, (kg / max) * 100)}%` }} />
      </div>
    </>
  );
}

export default function Products() {
  const { live, user } = useApp();
  const products = live('products');
  const max = Math.max(1, ...products.map((p) => Number(p.stockKg) || 0));
  return (
    <div className="page">
      <Seo title="Produits" path="/produits" description="Consultez les produits disponibles (café, cacao…) et commandez en tant que client agréé de l'USCAEP." />
      <h1>Produits disponibles</h1>
      <p className="max-w-xl text-stone-600">Les stocks sont mis à jour automatiquement à chaque vente validée.</p>
      {products.length === 0 && <p className="empty">Aucun produit en mémoire pour l'instant.</p>}
      <ul className="cards mt-4">
        {products.map((p) => (
          <li key={p.id} className="card">
            <h2>{p.name}</h2>
            <p className="text-sm text-stone-600">{p.description}</p>
            <Level kg={Number(p.stockKg) || 0} max={max} />
          </li>
        ))}
      </ul>
      <h2>Commander</h2>
      <p className="note">
        Les commandes sont réservées aux clients agréés et multinationales du secteur.{' '}
        {user?.role === 'client'
          ? <Link to="/espace-client" className="font-bold">Accéder à mon espace client</Link>
          : user ? 'Votre profil ne permet pas de passer commande.'
          : <><Link to="/connexion" className="font-bold">Se connecter</Link> ou <Link to="/inscription" className="font-bold">demander un agrément</Link>.</>}
      </p>
    </div>
  );
}
