import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import Field from '../components/Field.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    try {
      await register(Object.fromEntries(new FormData(e.currentTarget)));
      navigate('/espace-client');
    } catch (err) { setError(err.message); }
  }
  return (
    <div className="page narrow">
      <Seo title="Créer un compte client" path="/inscription" description="Demandez l'agrément de votre entreprise pour commander auprès de l'USCAEP." />
      <h1>Créer un compte client</h1>
      <p className="note">Votre compte sera examiné par l'administration de l'USCAEP. Vous pourrez commander dès que votre entreprise sera agréée.</p>
      {error && <p className="note warn" role="alert">{error}</p>}
      <form className="form" onSubmit={submit}>
        <Field label="Entreprise" id="company" required autoComplete="organization" />
        <Field label="Nom du contact" id="name" required autoComplete="name" />
        <Field label="Adresse e-mail (votre identifiant)" id="email" type="email" required autoComplete="email" />
        <Field label="Mot de passe (6 caractères minimum)" id="password" type="password" minLength="6" required autoComplete="new-password" />
        <label className="check"><input type="checkbox" name="notifyEmail" defaultChecked /> Me prévenir par e-mail (agrément, commandes validées)</label>
        <button className="btn" type="submit">Créer mon compte</button>
      </form>
    </div>
  );
}
