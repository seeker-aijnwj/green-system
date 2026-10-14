import { useState } from 'react';
import { BellRing, KeyRound } from 'lucide-react';
import Seo from '../components/Seo.jsx';
import Field from '../components/Field.jsx';
import { useApp } from '../context/AppContext.jsx';
import { ROLE_LABEL } from '../lib/roles.js';
import { useNotifyStatus } from '../lib/useNotifyStatus.js';

const ERR = {
  email: 'Adresse e-mail invalide.',
  phone: 'Numéro invalide (ex. +225 01 02 03 04 05 ou 0102030405).',
  contact: "Renseignez d'abord l'e-mail ou le numéro correspondant au rappel que vous activez.",
  password: 'Mot de passe actuel incorrect.',
  invalid: 'Informations invalides (mot de passe de 6 caractères minimum).',
  nochannel: "Aucun rappel n'est activé pour votre compte : enregistrez d'abord vos choix."
};
const WHAT = {
  gestionnaire: "les parts de commande proposées à votre coopérative, les rappels si vous n'avez pas répondu, et les ventes validées",
  agent: 'les refus de parts par les coopératives, la fin des accords (vente prête à valider)',
  client: "l'agrément de votre entreprise et la validation de vos commandes",
  administrateur: 'les messages de test (les rappels concernent les coopératives, les agents et les clients)'
};

/** Profil : coordonnées et choix des rappels. Les rappels sont toujours facultatifs et désactivables. */
export default function Profile() {
  const { user, updateUser, online } = useApp();
  const status = useNotifyStatus(user.token);
  const [f, setF] = useState({ name: user.name || '', email: user.email || '', phone: user.phone || '', emailOn: !!user.notify?.email, smsOn: !!user.notify?.sms });
  const [msg, setMsg] = useState(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` };

  async function call(method, url, body, ok) {
    try {
      const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(ERR[data.error] || 'Action refusée.');
      setMsg({ type: 'ok', text: typeof ok === 'function' ? ok(data) : ok });
      return data;
    } catch (e) {
      setMsg({ type: 'warn', text: e.message === 'Failed to fetch' ? 'Connexion Internet requise.' : e.message });
      return null;
    }
  }

  async function save(e) {
    e.preventDefault();
    const u = await call('PATCH', '/api/me', { name: f.name, email: f.email, phone: f.phone, notify: { email: f.emailOn, sms: f.smsOn } }, 'Profil enregistré.');
    if (u) { updateUser(u); setF({ ...f, email: u.email || '', phone: u.phone || '' }); }
  }
  const test = () => call('POST', '/api/notify/test', null, (d) => `Message de test envoyé (${d.results.map((r) => `${r.channel} : ${r.status === 'sent' ? 'parti' : 'échec'}`).join(', ')}).`);
  async function changePassword(e) {
    e.preventDefault();
    if (await call('PATCH', '/api/me', pw, 'Mot de passe modifié.')) setPw({ currentPassword: '', newPassword: '' });
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const emailAvail = !!status?.email;
  const smsAvail = !!status?.sms;

  return (
    <div className="page">
      <Seo title="Mon profil" path="/profil" noindex description="Coordonnées et préférences de rappel." />
      <h1>Mon profil</h1>
      <p className="text-stone-600">{ROLE_LABEL[user.role]} · identifiant <code>{user.matricule}</code></p>
      {!online && <p className="note warn">Hors connexion : le profil se modifie uniquement avec Internet.</p>}
      {msg && <p className={`note ${msg.type}`} role="status">{msg.text}</p>}

      <form className="form" onSubmit={save}>
        <Field label="Nom" id="name" required value={f.name} onChange={set('name')} autoComplete="name" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Adresse e-mail" id="email" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
          <Field label="Téléphone mobile (SMS)" id="phone" type="tel" value={f.phone} onChange={set('phone')} placeholder="+225 01 02 03 04 05" autoComplete="tel" />
        </div>

        <fieldset className="rounded-xl border border-forest-100 p-4">
          <legend className="flex items-center gap-2 px-2 font-bold text-forest-900"><BellRing className="size-5" aria-hidden="true" /> Rappels (facultatifs)</legend>
          <p className="mb-3 text-sm text-stone-600">Recevez {WHAT[user.role]}. Vous pouvez tout désactiver à tout moment ; l'application fonctionne de la même façon sans rappels.</p>
          <label className="check"><input type="checkbox" checked={f.emailOn} onChange={set('emailOn')} disabled={!emailAvail} /> Me prévenir par e-mail</label>
          {status && !emailAvail && <p className="ml-7 text-xs text-stone-500">Les rappels par e-mail ne sont pas activés sur ce serveur.</p>}
          <label className="check"><input type="checkbox" checked={f.smsOn} onChange={set('smsOn')} disabled={!smsAvail} /> Me prévenir par SMS</label>
          {status && !smsAvail && <p className="ml-7 text-xs text-stone-500">Les rappels par SMS ne sont pas activés sur ce serveur.</p>}
          {!status && <p className="text-xs text-stone-500">Disponibilité des rappels inconnue : connectez-vous à Internet.</p>}
          {status && (emailAvail || smsAvail) && user.role === 'gestionnaire' && (
            <p className="mt-2 text-xs text-stone-500">Si vous ne répondez pas à une part de commande, un premier rappel est envoyé après {status.afterHours} h, puis tous les {status.repeatHours} h (maximum {status.max}), jamais la nuit (GMT : {status.quiet === 'off' ? 'sans restriction' : `pas entre ${status.quiet.replace('-', ' h et ')} h`}).</p>
          )}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button className="btn" type="submit" disabled={!online}>Enregistrer</button>
          <button className="btn dark" type="button" onClick={test} disabled={!online || !((f.emailOn && emailAvail) || (f.smsOn && smsAvail)) || !(user.notify?.email || user.notify?.sms)}>Envoyer un message de test</button>
        </div>
      </form>

      <h2 className="flex items-center gap-2"><KeyRound className="size-5" aria-hidden="true" /> Mot de passe</h2>
      <form className="form" onSubmit={changePassword}>
        <Field label="Mot de passe actuel" id="currentPassword" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
        <Field label="Nouveau mot de passe (6 caractères min.)" id="newPassword" type="password" minLength="6" required autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
        <button className="btn" type="submit" disabled={!online}>Changer</button>
      </form>
    </div>
  );
}
