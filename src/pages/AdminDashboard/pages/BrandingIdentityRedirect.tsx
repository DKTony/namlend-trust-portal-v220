import { Navigate } from 'react-router-dom';

/** Preserve legacy bookmarks while keeping brand identity read-only in Tenant Info. */
export default function BrandingIdentityRedirect() {
  return <Navigate to="/admin/tenant-info" replace />;
}
