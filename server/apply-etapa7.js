'use strict';
// Aplica apenas a migration da ETAPA 7 (3 produtos novos reais em "Blusas").
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

async function run() {
  const conn = await getScriptConnection();
  console.log('Conectado!');

  const sql = fs.readFileSync(path.join(__dirname, 'sql/etapa7_add_produtos_blusas_reais.sql'), 'utf8');
  await conn.query(sql);
  console.log('✅ Etapa 7 aplicada — 3 produtos novos inseridos em Blusas');

  await conn.end();
  console.log('Pronto!');
}

run().catch(console.error);
