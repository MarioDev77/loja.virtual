'use strict';

const express = require('express');

const productsRoutes = require('./products');
const ordersRoutes = require('./orders');
const authRoutes = require('./auth');
const adminRoutes = require('./admin');

const apiRouter = express.Router();

// ─── Rotas públicas / semi-públicas ──────────────────────────────────────────
apiRouter.use('/products', productsRoutes);
apiRouter.use('/orders', ordersRoutes);
apiRouter.use('/auth', authRoutes);

// ─── Rotas de admin ───────────────────────────────────────────────────────────
// SEGURANÇA: prefixo não óbvio. Qualquer tentativa em /api/admin retorna 404.
// Mude ADMIN_ROUTE_PREFIX no .env para maior obscuridade.
const adminPrefix = process.env.ADMIN_ROUTE_PREFIX || '/manage';
apiRouter.use(adminPrefix, adminRoutes);

// Bloqueia tentativas óbvias de descoberta de painel admin
const COMMON_ADMIN_PATHS = [
  '/admin', '/administrator', '/wp-admin', '/dashboard',
  '/panel', '/backoffice', '/cp', '/controlpanel',
];
for (const p of COMMON_ADMIN_PATHS) {
  apiRouter.all(p, (req, res) => res.status(404).json({ error: 'Not found' }));
  apiRouter.all(`${p}/*`, (req, res) => res.status(404).json({ error: 'Not found' }));
}

module.exports = { apiRouter };
