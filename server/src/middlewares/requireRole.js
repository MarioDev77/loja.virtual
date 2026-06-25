'use strict';

/**
 * requireRole — middleware que exige uma role específica no JWT.
 *
 * Uso:
 *   router.get('/admin/dashboard', authJwt, requireRole('admin'), handler);
 *
 * - Retorna 403 genérico (não revela se a rota existe para outros roles).
 * - Deve ser usado APÓS authJwt (que popula req.user).
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      // authJwt não foi aplicado antes — erro de programação
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!roles.includes(req.user.role)) {
      // Propositalmente vago — não confirma existência da rota
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = { requireRole };
