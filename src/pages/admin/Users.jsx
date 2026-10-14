import { useCallback, useEffect, useState } from 'react';
import Seo from '../../components/Seo.jsx';
import Field from '../../components/Field.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { ROLE_LABEL } from '../../lib/roles.js';

export default function AdminUsers() {
  const { user, live, online } = useApp();
  const [users, setUsers] = useState(null);
  const [role, setRole] = useState('gestionnaire');
  const [filter, setFilter] = useState('tous');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const coops = live('cooperatives');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` };

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/users', { headers });
      if (!r.ok) throw new Error();
      setUsers(await r.json());
    } catch { setUsers(null); setMsg({ type: 'warn', text: 'Impossible de charger les comptes : connexion Internet requise.' }); }
  }, [user.token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const errors = { exists: 'Cet identifiant existe déjà.', invalid: 'Champs invalides (mot de passe : 6 caractères minimum).', cooperative: 'Choisissez une coopérative.', contact: 'E-mail ou téléphone invalide (ex. +225 01 02 03 04 05).', self: 'Vous ne pouvez pas désactiver ou rétrograder votre propre compte.' };
  async function call(url, method, body, okText) {
    try {
      const r = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(errors[e.error] || 'Action refusée.'); }
      setMsg({ type: 'ok', text: okText });
      load();
      return true;
    } catch (e) { setMsg({ type: 'warn', text: e.message === 'Failed to fetch' ? 'Connexion Internet requise.' : e.message }); return false; }
  }

  async function create(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form));
    if (await call('/api/users', 'POST', { ...f, role, approved: f.approved === 'on', notify: { email: f.notifyEmail === 'on', sms: f.notifySms === 'on' } }, 'Compte créé.')) { form.reset(); setRole('gestionnaire'); }
  }
  const patch = (u, body, text) => call(`/api/users/${encodeURIComponent(u.matricule)}`, 'PATCH', body, text);
  const contacts = (u) => {
    const email = window.prompt(`E-mail de ${u.matricule} (laisser vide pour retirer)`, u.email || '');
    if (email === null) return;
    const phone = window.prompt('Téléphone (+225… ou 10 chiffres, vide pour retirer)', u.phone || '');
    if (phone === null) return;
    patch(u, { email, phone }, 'Coordonnées enregistrées.');
  };
  const resetPw = (u) => {
    const password = window.prompt(`Nouveau mot de passe pour ${u.matricule} (6 caractères minimum)`);
    if (password) patch(u, { password }, 'Mot de passe réinitialisé.');
  };

  const shown = (users || []).filter((u) => filter === 'tous' || (filter === 'attente' ? u.role === 'client' && !u.approved : u.role === filter));
  const coopName = (id) => coops.find((c) => c.id === id)?.name || '';

  return (
    <div className="page">
      <Seo title="Utilisateurs" path="/administration/utilisateurs" noindex description="Gestion des comptes utilisateurs." />
      <h1>Utilisateurs</h1>
      {!online && <p className="note warn">Hors connexion : la gestion des comptes nécessite Internet.</p>}
      {msg.text && <p className={`note ${msg.type}`} role="status">{msg.text}</p>}

      <h2>Créer un compte</h2>
      <form className="form" onSubmit={create}>
        <Field label="Profil" id="role" as="select" value={role} onChange={(e) => setRole(e.target.value)}>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Field>
        <Field label={role === 'client' ? 'E-mail (identifiant)' : 'Matricule'} id="matricule" required />
        <Field label="Nom complet" id="name" required />
        {role === 'gestionnaire' && (
          <Field label="Coopérative" id="cooperativeId" as="select" required defaultValue="">
            <option value="" disabled>Choisir</option>
            {coops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Field>
        )}
        {role === 'client' && <Field label="Entreprise" id="company" required />}
        <Field label="E-mail de contact (facultatif)" id="email" type="email" />
        <Field label="Téléphone (facultatif)" id="phone" type="tel" placeholder="+225 01 02 03 04 05" />
        <label className="check"><input type="checkbox" name="notifyEmail" /> Rappels par e-mail</label>
        <label className="check"><input type="checkbox" name="notifySms" /> Rappels par SMS</label>
        <Field label="Mot de passe provisoire" id="password" type="text" minLength="6" required autoComplete="off" />
        {role === 'client' && <label className="check"><input type="checkbox" name="approved" /> Agréer directement</label>}
        <button className="btn" type="submit" disabled={!online}>Créer</button>
      </form>

      <h2>Comptes</h2>
      <div className="field"><label htmlFor="filter">Filtrer</label>
        <select id="filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="tous">Tous</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          <option value="attente">Clients en attente d'agrément</option>
        </select>
      </div>
      {users === null ? <p className="empty">Aucune donnée.</p> : (
        <div className="scroll"><table>
          <thead><tr><th>Identifiant</th><th>Nom</th><th>Profil</th><th>État</th><th>Actions</th></tr></thead>
          <tbody>{shown.map((u) => (
            <tr key={u.matricule}>
              <td>{u.matricule}</td>
              <td>{u.name}{u.company && <><br /><small>{u.company}</small></>}{(u.email || u.phone) && <><br /><small className="text-stone-500">{u.email}{u.email && u.phone ? ' · ' : ''}{u.phone}</small></>}{u.cooperativeId && <><br /><small>{coopName(u.cooperativeId)}</small></>}</td>
              <td>{ROLE_LABEL[u.role]}</td>
              <td>
                <span className={u.active ? 'tag ok' : 'tag'}>{u.active ? 'Actif' : 'Désactivé'}</span>{' '}
                {u.role === 'client' && <span className={u.approved ? 'tag ok' : 'tag'}>{u.approved ? 'Agréé' : 'Non agréé'}</span>}
              </td>
              <td className="row-actions">
                {u.role === 'client' && <button type="button" className="link" onClick={() => patch(u, { approved: !u.approved }, u.approved ? 'Agrément retiré.' : 'Client agréé.')}>{u.approved ? 'Retirer l\'agrément' : 'Agréer'}</button>}
                <button type="button" className="link" onClick={() => patch(u, { active: !u.active }, u.active ? 'Compte désactivé.' : 'Compte réactivé.')} disabled={u.matricule === user.matricule}>{u.active ? 'Désactiver' : 'Réactiver'}</button>
                <button type="button" className="link" onClick={() => contacts(u)}>Contacts</button>
                <button type="button" className="link" onClick={() => resetPw(u)}>Mot de passe</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
