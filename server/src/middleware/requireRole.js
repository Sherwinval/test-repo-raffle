const DEFAULT_ROLE = 'ADMIN';
const isProd = process.env.NODE_ENV === 'production';

export function resolveRequestRole(req) {
  if (req.user?.role) return String(req.user.role).toUpperCase();
  const header = req.headers?.['x-debug-role'];
  if (!isProd && header) return String(header).toUpperCase();
  if (isProd) return null;
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
    if (!role) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        requestId: req.id
      });
    }
    if (!allowed.includes(role)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Forbidden.', details: { role, requires: allowed } },
        requestId: req.id
      });
    }
    req.role = role;
    next();
  };
}
