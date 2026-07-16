'use strict';
// Aplica a migration da ETAPA 10 (9 chuteiras de campo - peças únicas).
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

async function run() {
  const conn = await getScriptConnection();
  console.log('Conectado!');

  const sql = fs.readFileSync(path.join(__dirname, 'sql/etapa10_add_chuteiras_campo.sql'), 'utf8');
  await conn.query(sql);
  console.log('✅ Etapa 10 aplicada — 9 chuteiras de campo inseridas');

  await conn.end();
  console.log('Pronto!');
}

run().catch(console.error);
