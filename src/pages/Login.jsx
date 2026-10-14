import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import Field from '../components/Field.jsx';
import { useApp } from '../context/AppContext.jsx';
import { ROLE_HOME } from '../lib/roles.js';

const DEMO = [
  ['Administrateur', 'ADM-001', 'admin123'],
  ['Gestionnaire (Daloa)', 'GEST-001', 'gestion123'],
  ['Gestionnaire (Soubré)', 'GEST-002', 'gestion123'],
  ['Agent commercial', 'AGT-001', 'agent123'],
  ['Client agréé', 'achats@cocoatrade.test', 'client123'],
  ['Client en attente d\'agrément', 'contact@choco-nord.test', 'client123']
];

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    const { matricule, password } = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const u = await login(matricule.trim(), password);
      navigate(ROLE_HOME[u.role] || '/');
    } catch (err) { setError(err.message); }
  }
  return (
    <div className="page narrow">
      <Seo title="Connexion" path="/connexion" noindex description="Connexion à Green System." />
      <h1>Connexion</h1>
      {error && <p className="note warn" role="alert">{error}</p>}
      <form className="form" onSubmit={submit}>
        <Field label="Matricule ou e-mail" id="matricule" required autoComplete="username" />
        <Field label="Mot de passe" id="password" type="password" required autoComplete="current-password" />
        <button className="btn" type="submit">Se connecter</button>
      </form>
      <p>Vous êtes un client ? <Link to="/inscription">Créer un compte client</Link></p>
      <details className="note">
        <summary>Comptes fictifs de démonstration</summary>
        <div className="scroll"><table>
          <thead><tr><th>Profil</th><th>Identifiant</th><th>Mot de passe</th></tr></thead>
          <tbody>{DEMO.map(([p, i, m]) => <tr key={i}><td>{p}</td><td><code>{i}</code></td><td><code>{m}</code></td></tr>)}</tbody>
        </table></div>
      </details>
    </div>
  );
}
