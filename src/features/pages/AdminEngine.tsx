import { Navigate } from 'react-router-dom';

// Unified admin: legacy /admin/engine now redirects to the single /admin panel.
export default function AdminEngine() {
  return <Navigate to="/admin" replace />;
}
