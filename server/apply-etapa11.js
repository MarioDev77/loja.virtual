'use strict';
// Aplica a migration da ETAPA 11 (Mizuno Morelia Neo 3 + 2 Predator + F50).
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

async function run() {
  const conn = await getScriptConnection();
  console.log('Conectado!');

  const sql = fs.readFileSync(path.join(__dirname, 'sql/etapa11_add_chuteiras_campo_2.sql'), 'utf8');
  await conn.query(sql);
  console.log('✅ Etapa 11 aplicada — 4 chuteiras de campo inseridas');

  await conn.end();
  console.log('Pronto!');
}

run().catch(console.error);
