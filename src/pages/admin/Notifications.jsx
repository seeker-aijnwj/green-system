import { useState } from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import Seo from '../../components/Seo.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { fmtDateTime } from '../../lib/clock.js';
import { useNotifyStatus } from '../../lib/useNotifyStatus.js';

const TYPES = {
  'share.proposed': 'Part proposée', 'share.reminder': 'Rappel de réponse', 'share.declined': 'Part refusée', 'order.ready': 'Accords complets',
  'order.validated.coop': 'Vente validée (coopérative)', 'order.validated.client': 'Vente validée (client)', 'client.approved': 'Agrément client', test: 'Test'
};

/** Suivi des rappels e-mail / SMS : état des canaux, relance manuelle, journal des envois. */
export default function AdminNotifications() {
  const { user, live, online } = useApp();
  const status = useNotifyStatus(user.token);
  const [msg, setMsg] = useState(null);
  const log = live('notifications').sort((a, b) => b.createdAt - a.createdAt).slice(0, 60);
  const coops = live('cooperatives');
  const cname = (id) => coops.find((c) => c.id === id)?.name.replace('Coopérative ', '') || '';
  const headers = { Authorization: `Bearer ${user.token}` };

  async function act(url, ok) {
    try {
      const r = await fetch(url, { method: 'POST', headers });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error === 'nochannel' ? "Aucun canal actif pour votre compte : activez un rappel dans votre profil (avec une coordonnée)." : 'Action refusée.');
      setMsg({ type: 'ok', text: ok(d) });
    } catch (e) { setMsg({ type: 'warn', text: e.message === 'Failed to fetch' ? 'Connexion Internet requise.' : e.message }); }
  }
  const runText = (d) => (d.disabled ? "Aucun canal n'est configuré sur le serveur." : d.quiet ? 'Heures calmes (GMT) : aucun rappel envoyé maintenant.' : `Rappels envoyés : ${d.sent} · échecs : ${d.failed} · destinataires examinés : ${d.checked}.`);
  const Card = ({ Icon, title, kind }) => (
    <li className="card"><Icon className="mb-2 size-6 text-forest-600" aria-hidden="true" /><strong>{title}</strong>
      <p className={`tag mt-2 ${kind ? 'ok' : ''}`}>{status ? (kind ? `Activé (${kind})` : 'Désactivé') : 'Inconnu (hors-ligne)'}</p></li>
  );

  return (
    <div className="page">
      <Seo title="Notifications" path="/administration/notifications" noindex description="Suivi des rappels par e-mail et SMS." />
      <h1>Rappels et notifications</h1>
      <p className="max-w-2xl text-stone-600">Les rappels sont facultatifs : chaque utilisateur choisit dans son profil de les recevoir par e-mail et/ou SMS. Les fournisseurs se configurent dans le fichier <code>.env</code> du serveur (voir README).</p>
      {msg && <p className={`note ${msg.type}`} role="status">{msg.text}</p>}

      <ul className="cards">
        <Card Icon={Mail} title="E-mail" kind={status?.email} />
        <Card Icon={MessageSquare} title="SMS" kind={status?.sms} />
        <li className="card"><strong>Rappels aux coopératives</strong>
          <p className="mt-2 text-sm text-stone-600">{status ? `1er rappel après ${status.afterHours} h, puis toutes les ${status.repeatHours} h, ${status.max} au plus. Heures calmes (GMT) : ${status.quiet === 'off' ? 'aucune' : status.quiet.replace('-', ' h → ') + ' h'}.` : '—'}</p></li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={!online} onClick={() => act('/api/notify/run-reminders', runText)}>Lancer les rappels maintenant</button>
        <button type="button" className="btn dark" disabled={!online} onClick={() => act('/api/notify/test', (d) => `Message de test envoyé (${d.results.map((r) => `${r.channel} : ${r.status}`).join(', ')}).`)}>Envoyer un test à mon compte</button>
      </div>

      <h2>Journal des envois</h2>
      {log.length === 0 ? <p className="empty">Aucun envoi pour l'instant.</p> : (
        <div className="scroll">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Destinataire</th><th>Canal</th><th>Statut</th></tr></thead>
            <tbody>{log.map((n) => (
              <tr key={n.id}>
                <td>{fmtDateTime(n.createdAt)}</td>
                <td>{TYPES[n.type] || n.type}{n.rank ? ` (${n.rank})` : ''}{n.cooperativeId && <><br /><small className="text-stone-500">{cname(n.cooperativeId)}{n.quantityKg ? ` · ${n.quantityKg.toLocaleString('fr-FR')} kg` : ''}</small></>}</td>
                <td>{n.user}<br /><small className="text-stone-500">{n.to}</small></td>
                <td>{n.channel === 'email' ? 'E-mail' : 'SMS'}</td>
                <td><span className={`tag ${n.status === 'sent' ? 'ok' : 'warn'}`}>{n.status === 'sent' ? 'Envoyé' : 'Échec'}</span>{n.error && <><br /><small className="text-stone-500">{n.error}</small></>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
