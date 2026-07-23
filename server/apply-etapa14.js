'use strict';
// Aplica a migration da ETAPA 14 (remove TODOS os produtos do catálogo,
// seed e cadastrados pelo admin, pra recomeçar do zero).
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

async function run() {
  const conn = await getScriptConnection();
  console.log('Conectado!');

  const sql = fs.readFileSync(path.join(__dirname, 'sql/etapa14_remover_todos_produtos.sql'), 'utf8');
  const [results] = await conn.query(sql);

  const lastResult = Array.isArray(results) ? results[results.length - 1] : results;
  console.log('✅ Etapa 14 aplicada — todos os produtos foram removidos.');
  console.table(lastResult);

  await conn.end();
  console.log('Pronto! Catálogo zerado, pode cadastrar do zero pelo painel admin.');
}

run().catch(console.error);
