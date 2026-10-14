import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

export default function Guard({ role, children }) {
  const { user } = useApp();
  const roles = [].concat(role);
  if (!user || !roles.includes(user.role)) return <Navigate to="/connexion" replace />;
  return children;
}
