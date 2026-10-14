import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';

export default function NotFound() {
  return (
    <div className="page">
      <Seo title="Page introuvable" noindex description="Cette page n'existe pas." />
      <h1>Page introuvable</h1>
      <p><Link to="/">Retourner à l'accueil</Link></p>
    </div>
  );
}
