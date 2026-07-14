'use strict';
// Aplica a migration da ETAPA 9 (4 chuteiras society - peças únicas).
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

async function run() {
  const conn = await getScriptConnection();
  console.log('Conectado!');

  const sql = fs.readFileSync(path.join(__dirname, 'sql/etapa9_add_chuteiras_society.sql'), 'utf8');
  await conn.query(sql);
  console.log('✅ Etapa 9 aplicada — 4 chuteiras society inseridas');

  await conn.end();
  console.log('Pronto!');
}

run().catch(console.error);
