import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useNotifyStatus } from '../lib/useNotifyStatus.js';

/** Invite (une seule fois utile) à activer les rappels, uniquement si le serveur les propose et que l'utilisateur ne les a pas choisis. */
export default function NotifyHint() {
  const { user } = useApp();
  const s = useNotifyStatus(user?.token);
  if (!s || !(s.email || s.sms) || user.notify?.email || user.notify?.sms) return null;
  return (
    <p className="note flex items-start gap-2"><Bell className="mt-0.5 size-5 shrink-0 text-forest-600" aria-hidden="true" />
      <span>Pour ne manquer aucune demande, <Link to="/profil" className="font-bold">activez vos rappels par e-mail ou par SMS</Link> (facultatif).</span></p>
  );
}
