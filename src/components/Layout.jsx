import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, ClipboardList, Handshake, Heart, House, LayoutDashboard, Leaf, LogIn, LogOut, Mail, Package, Settings,
  PackageCheck, ShoppingBag, Sprout, Trophy, User, Truck, UserCog, Users, Warehouse
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { ROLE_HOME, ROLE_LABEL } from '../lib/roles.js';
import SyncBadge from './SyncBadge.jsx';
import { now } from '../lib/clock.js';
import ClockBadge, { ClockNotice } from './ClockBadge.jsx';

const MSG = {
  stock: "Validation refusée : le stock d'une des coopératives de la répartition est insuffisant.",
  confirmation: "Validation refusée : chaque coopérative de la répartition doit d'abord accepter sa part.",
  obsolete: 'La part a été modifiée entre-temps : relisez la proposition mise à jour.',
  limite: "Limite atteinte : 5 messages d'entraide par jour. Revenez demain !",
  repartition: 'Validation refusée : la répartition entre coopératives doit totaliser la quantité commandée.',
  'stock-appro': 'Correction refusée : cette quantité a déjà été vendue.',
  justification: 'Modification refusée : une justification est obligatoire (après 20 h GMT, ou suppression avant validation).'
};
const explain = (r) => MSG[r.find((x) => MSG[x])] || `${r.length} modification(s) refusée(s) par le serveur (droits insuffisants).`;

const NAV = {
  public: [['/', 'Accueil', House], ['/activites', 'Activités', Sprout], ['/cooperatives', 'Coopératives', Warehouse], ['/classement', 'Classement', Trophy], ['/produits', 'Produits', Package], ['/contact', 'Contact', Mail]],
  '/espace-membre': [['/espace-membre', 'Tableau de bord', LayoutDashboard], ['/espace-membre/approvisionnements', 'Approvisionn.', Truck], ['/espace-membre/livraisons', 'Livraisons', PackageCheck], ['/espace-membre/entraide', 'Entraide', Heart], ['/espace-membre/producteurs', 'Producteurs', Users], ['/espace-membre/employes', 'Employés', UserCog]],
  '/administration': [['/administration', 'Tableau de bord', LayoutDashboard], ['/administration/commandes', 'Commandes', ClipboardList], ['/administration/utilisateurs', 'Utilisateurs', UserCog], ['/administration/notifications', 'Rappels', Bell], ['/administration/gestion', 'Gestion', Settings]],
  '/espace-agent': [['/espace-agent', 'Négociations', Handshake], ['/produits', 'Produits', Package]],
  '/espace-client': [['/espace-client', 'Mes commandes', ShoppingBag], ['/produits', 'Produits', Package]]
};

export default function Layout({ children }) {
  const { user, logout, sessionExpired, rejected, dismissRejected } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const section = Object.keys(NAV).find((k) => k !== 'public' && pathname.startsWith(k)) || (pathname.startsWith('/profil') && user ? ROLE_HOME[user.role] : 'public');
  const links = NAV[section];
  const crumbs = pathname.split('/').filter(Boolean);
  const home = user && ROLE_HOME[user.role];
  const desk = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-white/15 text-white' : 'text-forest-100 hover:bg-white/10 hover:text-white'}`;
  const tab = ({ isActive }) =>
    `relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition ${isActive ? 'text-forest-700' : 'text-stone-500'}`;

  return (
    <div className="flex min-h-dvh flex-col">
      <a className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3" href="#contenu">Aller au contenu</a>

      <header className="sticky top-0 z-30 bg-forest-800/95 pt-[env(safe-area-inset-top)] text-white shadow-md backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 md:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white no-underline">
            <span className="grid size-9 place-items-center rounded-xl bg-sun-500 text-bark-900"><Leaf className="size-5" aria-hidden="true" /></span>
            Green System
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {links.map(([to, label]) => <NavLink key={to} to={to} end className={desk}>{label}</NavLink>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ClockBadge />
            <SyncBadge />
            {user ? (
              <>
                {section === 'public' && (
                  <Link to={home} className="hidden min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-semibold text-white no-underline hover:bg-white/20 sm:inline-flex">
                    <LayoutDashboard className="size-4" aria-hidden="true" /> Mon espace
                  </Link>
                )}
                <Link to="/profil" aria-label="Mon profil" title="Mon profil" className="flex min-h-9 items-center gap-2 rounded-lg bg-white/10 px-2.5 text-white no-underline transition hover:bg-white/20">
                  <User className="size-4" aria-hidden="true" />
                  <span className="hidden text-right text-xs leading-tight lg:block">
                    <strong className="block text-sm">{user.name || user.matricule}</strong>
                    <span className="text-forest-200">{ROLE_LABEL[user.role]}</span>
                  </span>
                </Link>
                <button type="button" onClick={() => { logout(); navigate('/'); }} aria-label="Déconnexion" title="Déconnexion"
                  className="grid size-9 cursor-pointer place-items-center rounded-lg bg-white/10 transition hover:bg-white/20">
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <Link to="/connexion" className="btn small no-underline"><LogIn className="size-4" aria-hidden="true" /> Connexion</Link>
            )}
          </div>
        </div>
      </header>

      {sessionExpired && (
        <p className="border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-sm text-amber-900" role="alert">
          Votre session a expiré : vos saisies restent sur cet appareil. <Link to="/connexion" className="font-bold">Se reconnecter</Link> pour les envoyer.
        </p>
      )}
      {rejected.length > 0 && (
        <p className="border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-sm text-amber-900" role="alert">
          {explain(rejected)}{' '}
          <button type="button" className="link" onClick={dismissRejected}>Fermer</button>
        </p>
      )}

      <ClockNotice />

      {crumbs.length > 0 && (
        <nav className="mx-auto w-full max-w-5xl truncate px-4 pt-3 text-xs text-stone-500 md:px-6" aria-label="Fil d'Ariane">
          <Link to="/" className="text-stone-500">Accueil</Link>
          {crumbs.map((c, i) => (
            <span key={c}> / {i === crumbs.length - 1 ? <span aria-current="page" className="font-semibold text-forest-800">{c}</span> : <Link to={'/' + crumbs.slice(0, i + 1).join('/')} className="text-stone-500">{c}</Link>}</span>
          ))}
        </nav>
      )}

      <main id="contenu" key={pathname} className="flex-1 animate-fade-up">{children}</main>

      <footer className="px-4 pt-6 pb-24 text-center text-xs text-stone-500 md:pb-8">
        © {new Date(now()).getUTCFullYear()} USCAEP · Green System (version bêta)
      </footer>

      {/* Barre de navigation en bas de l'écran sur mobile : accessible au pouce */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-forest-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,.06)] backdrop-blur md:hidden" aria-label="Navigation mobile">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end className={tab}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 h-1 w-10 rounded-b-full bg-sun-500" />}
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="max-w-full truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
