'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');

const { errorHandler } = require('./routes/errorHandler');
const { apiRouter } = require('./routes');
const { UPLOAD_DIR } = require('./middlewares/upload');

// Pasta de imagens do catálogo inicial (versionada no repositório,
// diferente de UPLOAD_DIR que recebe uploads dinâmicos do admin em runtime).
const SEED_IMAGES_DIR = path.resolve(__dirname, '../seed-images');

// ─── Validação de env críticas no boot ───────────────────────────────────────
// A conexão com o MySQL pode vir de 3 formas (ver src/db/pool.js):
//   1) MYSQL_URL / DATABASE_URL          (Railway, connection string)
//   2) MYSQLHOST + MYSQLUSER + ...       (Railway, variáveis nativas)
//   3) DB_HOST + DB_USER + ...           (local / docker-compose)
// Por isso a validação aceita qualquer um dos três conjuntos — exigir
// sempre DB_HOST quebraria o boot em produção no Railway.
const hasConnectionString = !!(process.env.MYSQL_URL || process.env.DATABASE_URL);
const hasRailwayVars = !!process.env.MYSQLHOST;
const hasGenericDbVars = !!process.env.DB_HOST;

if (!hasConnectionString && !hasRailwayVars && !hasGenericDbVars) {
  console.error(
    'FATAL: missing database configuration — set MYSQL_URL, or MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE, or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME'
  );
  process.exit(1);
}

const REQUIRED_ENV = ['JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: missing required env var: ${key}`);
    process.exit(1);
  }
}
if ((process.env.JWT_SECRET || '').length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

const app = express();

// ─── Health (antes de tudo)
app.get("/health", (req, res) => res.status(200).end());

// ─── Fingerprinting ───────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.set('etag', false);

// ─── Helmet ───────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
  })
);

// ─── Headers extras ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
});


// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:5500'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        if (process.env.NODE_ENV === 'production')
          return callback(new Error('CORS: origin required in production'));
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 204,
  })
);

// ─── Compressão ───────────────────────────────────────────────────────────────
app.use(compression());

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb', strict: true }));

// Rejeita Content-Type errado em mutations (exceto multipart — usado no upload)
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('application/json') && !ct.includes('multipart/form-data')) {
      return res.status(415).json({ error: 'Content-Type must be application/json or multipart/form-data' });
    }
  }
  return next();
});

// ─── Rate limiting global ─────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 150,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  })
);

// Rate limit reforçado para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

// ─── Arquivos de upload (estático, só imagens processadas) ───────────────────
// Servido com headers restritivos — sem execução de scripts
app.use(
  '/uploads',
  (req, res, next) => {
    // Só GET e HEAD permitidos
    if (!['GET', 'HEAD'].includes(req.method))
      return res.status(405).end();
    // Path traversal: rejeita qualquer coisa com / ou .. fora do nome do arquivo
    if (/[/\\]/.test(req.params[0] || '') || req.path.includes('..'))
      return res.status(400).end();
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  },
  express.static(UPLOAD_DIR, {
    index: false,       // sem listagem de diretório
    dotfiles: 'deny',  // sem arquivos ocultos
    etag: false,
  })
);

// ─── Imagens do catálogo inicial (seed) ───────────────────────────────────────
// Mesmas proteções do /uploads. Pasta versionada no repositório (diferente de
// UPLOAD_DIR), pois são imagens fixas dos produtos, não uploads de usuário.
app.use(
  '/seed-images',
  (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method))
      return res.status(405).end();
    if (/[/\\]/.test(req.params[0] || '') || req.path.includes('..'))
      return res.status(400).end();
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  },
  express.static(SEED_IMAGES_DIR, {
    index: false,
    dotfiles: 'deny',
    etag: false,
  })
);

// ─── API ──────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter);
app.use('/api', apiRouter);

// ─── Catch-all ────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Boot ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[boot] Pitch Futebol API on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`[boot] Uploads: ${UPLOAD_DIR}`);
});

module.exports = app;
