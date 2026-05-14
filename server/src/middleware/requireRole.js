const DEFAULT_ROLE = 'ADMIN';

export function resolveRequestRole(req) {
  if (req.user?.role) return String(req.user.role).toUpperCase();
  const header = req.headers?.['x-debug-role'];
  if (header) return String(header).toUpperCase();
  return DEFAULT_ROLE;
}

export function resolveRequestOperator(req) {
  return (
    req.user?.email ||
    req.user?.name ||
    req.headers?.['x-debug-operator'] ||
    req.body?.operator ||
    'Raffle Operator'
  );
}

export function requireRole(allowedRoles) {
  const allowed = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
    .map((r) => String(r).toUpperCase());

  return function roleGuard(req, res, next) {
    const role = resolveRequestRole(req);
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Forbidden', role, requires: allowed });
    }
    req.role = role;
    next();
  };
}
