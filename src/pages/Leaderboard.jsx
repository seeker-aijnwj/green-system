import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, WifiOff } from 'lucide-react';
import Seo from '../components/Seo.jsx';
import Podium from '../components/Podium.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useLeaderboard } from '../lib/useLeaderboard.js';
import { fmtDateTime } from '../lib/clock.js';

const PERIODS = [['7', '7 derniers jours'], ['30', '30 derniers jours'], ['90', '90 derniers jours'], ['all', 'Depuis le début']];
const CRITERIA = {
  score: ['Score global', 'pts'],
  collectedKg: ['Volume collecté', 'kg'],
  perProducerKg: ['Productivité (kg par producteur)', 'kg'],
  soldKg: ['Ventes validées', 'kg'],
  activeDays: ['Régularité (jours actifs)', 'j']
};
const n = (v) => Number(v || 0).toLocaleString('fr-FR');

export default function Leaderboard() {
  const { user } = useApp();
  const [period, setPeriod] = useState('30');
  const [scope, setScope] = useState('cooperatives');
  const [by, setBy] = useState('score');
  const { data, loading, offline } = useLeaderboard(period);

  const rows = useMemo(
    () => [...(data?.[scope] || [])].sort((a, b) => b[by] - a[by] || b.collectedKg - a.collectedKg),
    [data, scope, by]
  );
  const unit = CRITERIA[by][1];

  return (
    <div className="page">
      <Seo title="Classement des coopératives" path="/classement"
        description="Classement des coopératives de l'USCAEP par volume collecté, productivité, ventes et régularité, au niveau local, régional et national." />
      <h1>Classement des coopératives</h1>
      <p className="max-w-2xl text-stone-600">
        Une émulation saine : le score combine le volume, la productivité par producteur, les ventes et la régularité, pour que chaque coopérative, petite ou grande, puisse progresser et se distinguer.
      </p>

      {offline && (
        <p className="note warn flex items-center gap-2"><WifiOff className="size-4 shrink-0" aria-hidden="true" />
          Hors connexion : dernier classement mémorisé{data ? ` (mis à jour le ${fmtDateTime(data.generatedAt)})` : ' indisponible'}.
        </p>
      )}

      <div className="form">
        <div className="field"><label htmlFor="period">Période</label>
          <select id="period" value={period} onChange={(e) => setPeriod(e.target.value)}>{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor="scope">Niveau</label>
          <select id="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="cooperatives">Coopératives (local)</option><option value="regions">Régions (national)</option></select></div>
        <div className="field"><label htmlFor="by">Classer par</label>
          <select id="by" value={by} onChange={(e) => setBy(e.target.value)}>{Object.entries(CRITERIA).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></div>
      </div>

      {data?.union && (
        <ul className="stats">
          <li><strong>{n(data.union.cooperatives)}</strong>coopératives</li>
          <li><strong>{n(data.union.producers)}</strong>producteurs</li>
          <li><strong>{n(data.union.collectedKg)}</strong>kg collectés</li>
          <li><strong>{n(data.union.soldKg)}</strong>kg vendus</li>
          <li><strong>{n(data.union.jointOrders)}</strong>commandes livrées ensemble</li>
        </ul>
      )}

      {loading && !data && <p className="empty">Chargement du classement…</p>}
      {!loading && !data && <p className="empty">Classement indisponible pour le moment. Connectez-vous à Internet une première fois.</p>}

      {rows.length > 0 && (
        <>
          <Podium items={rows.slice(0, 3).map((r) => ({ name: r.name, sub: scope === 'regions' ? `${r.cooperatives} coopérative(s)` : r.region, value: `${n(r[by])} ${unit}` }))} />
          <div className="scroll">
            <table>
              <thead><tr><th>#</th><th>{scope === 'regions' ? 'Région' : 'Coopérative'}</th><th>Collecté (kg)</th><th>kg / producteur</th><th>Vendu (kg)</th><th>Jours actifs</th><th>Score</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={user?.cooperativeId === r.id ? 'bg-sun-100!' : ''}>
                    <td className="font-extrabold text-forest-700">{i + 1}</td>
                    <td className="font-semibold">{r.name}{user?.role === 'gestionnaire' && scope === 'cooperatives' && r.id !== user.cooperativeId && <Link to={`/espace-membre/entraide?to=${r.id}`} className="ml-2 inline-block align-middle text-forest-600" aria-label={`Encourager ${r.name}`} title="Envoyer un mot d'encouragement"><Heart className="size-4" aria-hidden="true" /></Link>}{scope === 'cooperatives' && <><br /><small className="font-normal text-stone-500">{r.region}</small></>}</td>
                    <td>{n(r.collectedKg)}</td><td>{n(r.perProducerKg)}</td><td>{n(r.soldKg)}</td><td>{r.activeDays}</td>
                    <td className="min-w-28">
                      <strong>{r.score}</strong>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-forest-50" role="presentation"><div className="h-full rounded-full bg-forest-500" style={{ width: `${r.score}%` }} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-stone-500">Classement calculé sur l'heure GMT du serveur{data?.generatedAt ? ` · mis à jour le ${fmtDateTime(data.generatedAt)}` : ''}. Seuls des volumes sont publiés, jamais les prix.</p>
        </>
      )}
    </div>
  );
}
