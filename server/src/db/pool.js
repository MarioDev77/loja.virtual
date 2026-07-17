'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Resolução de configuração de conexão — suporta 3 cenários, nessa ordem:
 *
 * 1) MYSQL_URL / DATABASE_URL — connection string completa
 *    (Railway expõe MYSQL_URL automaticamente quando o plugin MySQL
 *    está linkado ao serviço: mysql://user:pass@host:port/database)
 * 2) MYSQLHOST / MYSQLPORT / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE
 *    — variáveis nativas do plugin MySQL do Railway, caso a connection
 *    string não tenha sido referenciada explicitamente.
 * 3) DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME — variáveis
 *    genéricas usadas em desenvolvimento local / docker-compose.
 *
 * Isso permite rodar exatamente o mesmo código local (docker-compose)
 * e em produção (Railway) sem alterar uma linha — só o .env muda.
 */
function resolvePoolConfig() {
  const connectionString = process.env.MYSQL_URL || process.env.DATABASE_URL;

  // SSL: hosts remotos usam TLS quando disponível. Em host local
  // (127.0.0.1/localhost/docker-compose) ou na rede privada do Railway
  // (*.railway.internal), mantemos SSL desligado — não é necessário e,
  // no caso do Railway, a rede interna já é isolada por projeto.
  const wantsSsl = (host) => {
    if (process.env.DB_SSL === 'false') return false;
    if (process.env.DB_SSL === 'true') return true;
    if (!host) return false;
    if (['localhost', '127.0.0.1', 'db', 'mysql'].includes(host)) return false;
    if (host.endsWith('.railway.internal')) return false;
    return true;
  };

  // rejectUnauthorized estrito (true) exige que o certificado do servidor
  // seja validado contra uma CA confiável. O proxy público do MySQL do
  // Railway (*.proxy.rlwy.net) apresenta um certificado que normalmente
  // NÃO passa nessa validação — isso derruba a conexão com um erro de
  // handshake TLS silencioso, e é uma causa comum de "service unavailable"
  // em produção sem nenhuma mensagem clara no log de build.
  // Por padrão usamos rejectUnauthorized: false (ainda criptografado, só
  // não valida a cadeia). Para exigir validação estrita (ex.: com CA
  // própria), defina DB_SSL_STRICT=true.
  const sslOptions = () => ({
    rejectUnauthorized: process.env.DB_SSL_STRICT === 'true',
  });

  if (connectionString) {
    let parsed;
    try {
      parsed = new URL(connectionString);
    } catch {
      console.error('FATAL: MYSQL_URL/DATABASE_URL inválida');
      process.exit(1);
    }
    const host = decodeURIComponent(parsed.hostname);
    return {
      host,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
      ssl: wantsSsl(host) ? sslOptions() : undefined,
    };
  }

  // Variáveis nativas do plugin MySQL do Railway
  if (process.env.MYSQLHOST) {
    const host = process.env.MYSQLHOST;
    return {
      host,
      port: Number(process.env.MYSQLPORT || 3306),
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      ssl: wantsSsl(host) ? sslOptions() : undefined,
    };
  }

  // Fallback: variáveis genéricas (local / docker-compose)
  const host = process.env.DB_HOST;
  return {
    host,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: wantsSsl(host) ? sslOptions() : undefined,
  };
}

const resolved = resolvePoolConfig();

const pool = mysql.createPool({
  host: resolved.host,
  port: resolved.port,
  user: resolved.user,
  password: resolved.password,
  database: resolved.database,
  ssl: resolved.ssl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // security: do not allow multiple statements
  multipleStatements: false,
});

// ─── Probe de conectividade no boot ───────────────────────────────────────────
// Não é fatal (não derruba o processo nem o healthcheck) — só deixa um log
// claro se o banco estiver inacessível, em vez do app parecer saudável
// (porque /health não depende do banco) enquanto toda rota que usa o DB falha.
pool
  .query('SELECT 1')
  .then(() => console.log(`[db] Conectado a ${resolved.host}:${resolved.port}/${resolved.database}`))
  .catch((err) => {
    console.error(
      `[db] FALHA ao conectar em ${resolved.host}:${resolved.port}/${resolved.database} — ${err.code || err.message}`
    );
  });

module.exports = { pool };

