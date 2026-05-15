import { useCurrentRole } from './useCurrentRole';

export function RequireRole({ role, children, fallback = null }) {
  const allowed = Array.isArray(role) ? role : [role];
  const current = useCurrentRole();
  if (!allowed.includes(current)) return fallback;
  return children;
}
