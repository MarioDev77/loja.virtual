'use strict';

const jwt = require('jsonwebtoken');

/**
 * authJwt — verifica Bearer token JWT.
 *
 * Melhorias de segurança vs versão original:
 *  - Algoritmo fixado em HS256 (evita "none" e confusão RS/HS)
 *  - audience + issuer opcionais via env (ativados se definidos)
 *  - Mensagens de erro genéricas (não vaza motivo específico)
 */
function authJwt(req, res, next) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = parts[1];

  // Rejeita tokens obviamente malformados antes de chamar jwt.verify
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const verifyOptions = {
      algorithms: ['HS256'], // Nunca aceitar "none" ou algoritmos assimétricos aqui
    };
    if (process.env.JWT_ISSUER) verifyOptions.issuer = process.env.JWT_ISSUER;
    if (process.env.JWT_AUDIENCE) verifyOptions.audience = process.env.JWT_AUDIENCE;

    const payload = jwt.verify(token, process.env.JWT_SECRET, verifyOptions);
    req.user = payload;
    return next();
  } catch {
    // Não vaza motivo (expirado, inválido, algoritmo errado…)
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { authJwt };
