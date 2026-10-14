import { Clock } from 'lucide-react';
import { useClock } from '../lib/useClock.js';
import { fmtDateTime, fmtTime } from '../lib/clock.js';

export default function ClockBadge() {
  const c = useClock();
  const title = c.synced
    ? `Heure GMT synchronisée avec le serveur le ${fmtDateTime(c.syncedAt)}${c.verified ? '' : ' : à re-vérifier dès que possible'}`
    : "Heure de l'appareil : pas encore synchronisée avec le serveur";
  return (
    <span title={title} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${c.verified ? 'bg-white/10 text-white' : 'bg-sun-100 text-bark-800'}`}>
      <Clock className="size-4" aria-hidden="true" />
      <span>{fmtTime(c.now)}</span>
      <span className="sr-only">{c.verified ? 'Heure vérifiée' : 'Heure à vérifier'}</span>
    </span>
  );
}

/** Information discrète quand l'heure du téléphone est décalée : Green System utilise l'heure GMT du serveur. */
export function ClockNotice() {
  const c = useClock();
  if (!c.synced || Math.abs(c.deviceOffset) < 5 * 60000) return null;
  const min = Math.round(Math.abs(c.deviceOffset) / 60000);
  return (
    <p className="border-b border-forest-200 bg-forest-50 px-4 py-2 text-xs text-forest-900" role="status">
      L'heure de votre téléphone est {c.deviceOffset > 0 ? 'en avance' : 'en retard'} d'environ {min} min. Aucun souci : Green System utilise l'heure GMT officielle du serveur.
    </p>
  );
}
