/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { Navigate } from '@/lib/router-compat';

// Unified admin: legacy /admin/engine now redirects to the single /admin panel.
export default function AdminEngine() {
  return <Navigate to="/admin" replace />;
}
