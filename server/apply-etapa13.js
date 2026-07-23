'use strict';
// Aplica a migration da ETAPA 13 (remove todos os produtos de seed/demo,
// mantendo os produtos cadastrados pelo admin via painel).
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

async function run() {
  const conn = await getScriptConnection();
  console.log('Conectado!');

  const sql = fs.readFileSync(path.join(__dirname, 'sql/etapa13_remover_produtos_seed.sql'), 'utf8');
  const [results] = await conn.query(sql);

  // O último resultado é o SELECT final de conferência.
  const lastResult = Array.isArray(results) ? results[results.length - 1] : results;
  console.log('✅ Etapa 13 aplicada — produtos de seed removidos.');
  console.log('Produtos restantes no catálogo:');
  console.table(lastResult);

  await conn.end();
  console.log('Pronto!');
}

run().catch(console.error);
