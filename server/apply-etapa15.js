'use strict';
// Aplica a migration da ETAPA 15 (renomeia a categoria 'Tênis' para
// 'Acessórios' — slug e nome; produtos existentes na categoria não mudam).
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

async function run() {
  const conn = await getScriptConnection();
  console.log('Conectado!');

  const sql = fs.readFileSync(path.join(__dirname, 'sql/etapa15_renomear_categoria_tenis_acessorios.sql'), 'utf8');
  const [results] = await conn.query(sql);

  const lastResult = Array.isArray(results) ? results[results.length - 1] : results;
  console.log('✅ Etapa 15 aplicada — categoria renomeada para Acessórios.');
  console.table(lastResult);

  await conn.end();
}

run().catch(console.error);
