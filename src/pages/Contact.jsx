import { useState } from 'react';
import Seo from '../components/Seo.jsx';
import Field from '../components/Field.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Contact() {
  const { upsert } = useApp();
  const [sent, setSent] = useState(false);
  async function submit(e) {
    e.preventDefault();
    await upsert('messages', Object.fromEntries(new FormData(e.currentTarget)));
    e.currentTarget.reset();
    setSent(true);
  }
  return (
    <div className="page">
      <Seo title="Contact" path="/contact" description="Contactez l'USCAEP pour une question, un partenariat ou une demande d'agrément." />
      <h1>Nous contacter</h1>
      {sent && <p className="note ok" role="status">Message enregistré. Il sera envoyé dès que possible.</p>}
      <form className="form" onSubmit={submit}>
        <Field label="Nom" id="name" required autoComplete="name" />
        <Field label="Adresse e-mail" id="email" type="email" required autoComplete="email" />
        <Field label="Message" id="body" as="textarea" required />
        <button className="btn" type="submit">Envoyer le message</button>
      </form>
    </div>
  );
}
