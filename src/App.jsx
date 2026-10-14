import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Guard from './components/Guard.jsx';

const page = (f) => lazy(f);
const Home = page(() => import('./pages/Home.jsx'));
const Activities = page(() => import('./pages/Activities.jsx'));
const Cooperatives = page(() => import('./pages/Cooperatives.jsx'));
const Leaderboard = page(() => import('./pages/Leaderboard.jsx'));
const Products = page(() => import('./pages/Products.jsx'));
const Contact = page(() => import('./pages/Contact.jsx'));
const Login = page(() => import('./pages/Login.jsx'));
const Register = page(() => import('./pages/Register.jsx'));
const NotFound = page(() => import('./pages/NotFound.jsx'));
const MemberDashboard = page(() => import('./pages/member/Dashboard.jsx'));
const Supplies = page(() => import('./pages/member/Supplies.jsx'));
const Deliveries = page(() => import('./pages/member/Deliveries.jsx'));
const Profile = page(() => import('./pages/Profile.jsx'));
const AdminNotifications = page(() => import('./pages/admin/Notifications.jsx'));
const Cheers = page(() => import('./pages/member/Cheers.jsx'));
const People = page(() => import('./pages/member/People.jsx'));
const AgentSpace = page(() => import('./pages/agent/Space.jsx'));
const ClientSpace = page(() => import('./pages/client/Space.jsx'));
const AdminDashboard = page(() => import('./pages/admin/Dashboard.jsx'));
const AdminOrders = page(() => import('./pages/admin/Orders.jsx'));
const AdminUsers = page(() => import('./pages/admin/Users.jsx'));
const AdminManage = page(() => import('./pages/admin/Manage.jsx'));

const G = ({ role, children }) => <Guard role={role}>{children}</Guard>;

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div className="grid place-items-center py-24" role="status" aria-label="Chargement"><span className="size-8 animate-spin rounded-full border-4 border-forest-200 border-t-forest-600" /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/activites" element={<Activities />} />
          <Route path="/cooperatives" element={<Cooperatives />} />
          <Route path="/classement" element={<Leaderboard />} />
          <Route path="/produits" element={<Products />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />

          <Route path="/espace-membre" element={<G role="gestionnaire"><MemberDashboard /></G>} />
          <Route path="/espace-membre/approvisionnements" element={<G role="gestionnaire"><Supplies /></G>} />
          <Route path="/espace-membre/livraisons" element={<G role="gestionnaire"><Deliveries /></G>} />
          <Route path="/espace-membre/entraide" element={<G role="gestionnaire"><Cheers /></G>} />
          <Route path="/espace-membre/producteurs" element={<G role="gestionnaire"><People kind="producers" /></G>} />
          <Route path="/espace-membre/employes" element={<G role="gestionnaire"><People kind="employees" /></G>} />

          <Route path="/profil" element={<G role={['administrateur', 'gestionnaire', 'agent', 'client']}><Profile /></G>} />
          <Route path="/administration/notifications" element={<G role="administrateur"><AdminNotifications /></G>} />
          <Route path="/espace-agent" element={<G role="agent"><AgentSpace /></G>} />
          <Route path="/espace-client" element={<G role="client"><ClientSpace /></G>} />

          <Route path="/administration" element={<G role="administrateur"><AdminDashboard /></G>} />
          <Route path="/administration/commandes" element={<G role="administrateur"><AdminOrders /></G>} />
          <Route path="/administration/utilisateurs" element={<G role="administrateur"><AdminUsers /></G>} />
          <Route path="/administration/gestion" element={<G role="administrateur"><AdminManage /></G>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
