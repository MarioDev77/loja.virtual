'use strict';
// Aplica a migration da ETAPA 8 (meias Jcolour + camisas/regatas térmicas c/ frases).
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

async function run() {
  const conn = await getScriptConnection();
  console.log('Conectado!');

  const sql = fs.readFileSync(path.join(__dirname, 'sql/etapa8_add_meias_camisas_termicas.sql'), 'utf8');
  await conn.query(sql);
  console.log('✅ Etapa 8 aplicada — Meias Jcolour + Camisa/Regata Térmica inseridas');

  await conn.end();
  console.log('Pronto!');
}

run().catch(console.error);
