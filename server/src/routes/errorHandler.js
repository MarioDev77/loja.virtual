'use strict';

const { ZodError } = require('zod');

/**
 * errorHandler global.
 *
 * SEGURANÇA:
 *  - Em produção nunca vaza stack trace ou mensagem interna
 *  - ZodError → 400 com detalhes de validação (sem info de DB)
 *  - Erros de DB (mysql2) → 500 genérico (código SQL não exposto)
 *  - Logging estruturado (substitua console.error por seu logger em produção)
 */
function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';

  // Log interno sempre completo
  console.error({
    ts: new Date().toISOString(),
    method: req.method,
    path: req.path,
    status: err.status || err.statusCode || 500,
    message: err.message,
    // Stack só em dev
    ...(isProd ? {} : { stack: err.stack }),
  });

  if (res.headersSent) return next(err);

  // ── Erros de validação Zod ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: err.flatten(),
    });
  }

  // ── Erros com status HTTP explícito (lançados pelo código) ────────────────
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // ── Erros de DB (mysql2) — nunca expõe SQL ────────────────────────────────
  if (err.code && err.sqlState !== undefined) {
    if (!isProd) {
      console.error('[DB Error]', err.code, err.sqlMessage);
    }
    // Constraint violations tratadas
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Conflict: duplicate entry' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }

  // ── Fallback genérico ─────────────────────────────────────────────────────
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
