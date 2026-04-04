/**
 * Legacy AdminDashboard entry point.
 * The admin portal now uses route-based navigation via AdminLayout + adminRoutes.
 * This file is retained only as a redirect in case any stale references exist.
 */

import { Navigate } from 'react-router-dom';

const AdminDashboard = () => <Navigate to="/admin/overview" replace />;

export default AdminDashboard;
