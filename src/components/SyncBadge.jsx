import { CircleCheck, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function SyncBadge() {
  const { online, pending, syncing, sync } = useApp();
  const s = !online
    ? { Icon: WifiOff, cls: 'bg-red-100 text-red-800', text: `Hors connexion${pending ? ` · ${pending} en attente` : ''}` }
    : syncing ? { Icon: RefreshCw, cls: 'bg-sun-100 text-bark-800', text: 'Synchronisation…', spin: true }
    : pending ? { Icon: Wifi, cls: 'bg-sun-100 text-bark-800', text: `${pending} en attente d'envoi` }
    : { Icon: CircleCheck, cls: 'bg-forest-100 text-forest-800', text: 'Données à jour' };
  return (
    <button type="button" onClick={sync} disabled={!online} aria-live="polite" title="Synchroniser maintenant"
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${s.cls}`}>
      <s.Icon className={`size-4 ${s.spin ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{s.text}</span>
    </button>
  );
}
