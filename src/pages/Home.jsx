import { Link } from 'react-router-dom';
import { ArrowRight, Handshake, Leaf, ShieldCheck, Truck, WifiOff } from 'lucide-react';
import Seo from '../components/Seo.jsx';
import Podium from '../components/Podium.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useLeaderboard } from '../lib/useLeaderboard.js';

const FEATURES = [
  [ShieldCheck, 'Fiable', 'Chaque approvisionnement est enregistré et protégé : toute modification tardive doit être justifiée.'],
  [WifiOff, 'Utilisable sans Internet', 'Saisissez en brousse, tout s\'envoie dès que le réseau revient. Rien n\'est perdu.'],
  [Handshake, 'Transparent', 'Prix négocié, statut de la commande et stock disponible : tout le monde voit la même information.']
];
const STEPS = [
  ['1', 'Commandez', 'Un client agréé envoie son bon de commande en quelques secondes.'],
  ['2', 'Négociez', 'Un agent commercial fixe le prix d\'achat avec vous.'],
  ['3', 'Recevez', 'La vente est validée, le stock est mis à jour automatiquement.']
];

export default function Home() {
  const { live } = useApp();
  const { data: lb } = useLeaderboard('30');
  const coops = live('cooperatives').length;
  const stock = live('products').reduce((a, p) => a + (Number(p.stockKg) || 0), 0);
  return (
    <>
      <Seo
        path="/"
        description="USCAEP, union de coopératives de producteurs de café et de cacao en Côte d'Ivoire. Consultez nos produits et passez vos bons de commande en ligne."
        jsonLd={{ '@context': 'https://schema.org', '@type': 'Organization', name: 'USCAEP', url: 'https://www.example.ci', areaServed: 'CI' }}
      />
      <section className="relative overflow-hidden bg-linear-to-br from-forest-800 via-forest-700 to-bark-800 text-white">
        <Leaf className="pointer-events-none absolute -top-10 -right-10 size-72 rotate-12 text-white/5" aria-hidden="true" />
        <Leaf className="pointer-events-none absolute -bottom-16 left-1/3 size-56 -rotate-12 text-sun-500/10" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-24">
          <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-sun-300 uppercase">Union de coopératives agricoles · Côte d'Ivoire</p>
          <h1 className="max-w-2xl text-4xl! leading-[1.1] text-white! md:text-6xl!">Du champ à votre commande, en toute confiance.</h1>
          <p className="mt-5 max-w-xl text-lg text-forest-100">
            L'USCAEP réunit {coops || 'une quinzaine de'} coopératives de café, de cacao et d'autres cultures. Suivez les approvisionnements, négociez et commandez, même quand le réseau est capricieux.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="btn no-underline" to="/produits">Voir les produits <ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link className="btn ghost no-underline" to="/inscription">Devenir client agréé</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-5xl grid-cols-3 gap-3 px-4 md:px-6" aria-label="Chiffres clés">
        {[[coops || '15+', 'coopératives'], ['3 000', 'producteurs formés'], [Math.round(stock).toLocaleString('fr-FR'), 'kg en stock']].map(([n, l]) => (
          <div key={l} className="relative rounded-2xl border border-forest-100 bg-white p-4 text-center shadow-lg">
            <strong className="block text-xl font-extrabold text-forest-700 md:text-3xl">{n}</strong>
            <span className="text-xs text-stone-600 md:text-sm">{l}</span>
          </div>
        ))}
      </section>

      <section className="page">
        {lb?.cooperatives?.length > 0 && (
          <>
            <h2 className="mt-2! text-2xl!">Le podium des 30 derniers jours</h2>
            <Podium items={[...lb.cooperatives].sort((a, b) => b.score - a.score).slice(0, 3).map((c) => ({ name: c.name, sub: `${c.collectedKg.toLocaleString('fr-FR')} kg collectés`, value: `${c.score} pts` }))} />
            <p className="mt-3 text-sm"><Link to="/classement" className="font-bold">Voir le classement complet →</Link></p>
          </>
        )}
        <h2 className="text-2xl!">Pourquoi Green System ?</h2>
        <ul className="mt-4 grid list-none gap-4 p-0 md:grid-cols-3">
          {FEATURES.map(([Icon, t, d]) => (
            <li key={t} className="card">
              <span className="mb-3 grid size-11 place-items-center rounded-xl bg-forest-100 text-forest-700"><Icon className="size-6" aria-hidden="true" /></span>
              <strong className="mb-1 block text-lg text-forest-900">{t}</strong>
              <span className="text-sm leading-relaxed text-stone-600">{d}</span>
            </li>
          ))}
        </ul>

        <h2 className="text-2xl!">Comment ça marche</h2>
        <ol className="mt-4 grid list-none gap-4 p-0 md:grid-cols-3">
          {STEPS.map(([n, t, d]) => (
            <li key={n} className="flex gap-4 rounded-2xl bg-forest-700 p-5 text-white">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sun-500 font-extrabold text-bark-900">{n}</span>
              <span><strong className="block text-lg">{t}</strong><span className="text-sm text-forest-100">{d}</span></span>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-sun-100 p-6 md:flex-row md:items-center md:justify-between">
          <div><strong className="block text-xl text-bark-900">Vous êtes une entreprise du secteur ?</strong><span className="text-bark-800">Demandez votre agrément pour commander auprès de nos coopératives.</span></div>
          <Link className="btn dark no-underline" to="/inscription"><Truck className="size-4" aria-hidden="true" /> Créer un compte client</Link>
        </div>
      </section>
    </>
  );
}
