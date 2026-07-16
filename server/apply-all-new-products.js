'use strict';
// Aplica TODAS as migrations pendentes (etapa7 a etapa11) de uma vez,
// na ordem certa. Roda uma vez só (todas fazem INSERT puro, sem ON DUPLICATE KEY).
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

const MIGRATIONS = [
  'sql/etapa7_add_produtos_blusas_reais.sql',
  'sql/etapa8_add_meias_camisas_termicas.sql',
  'sql/etapa9_add_chuteiras_society.sql',
  'sql/etapa10_add_chuteiras_campo.sql',
  'sql/etapa11_add_chuteiras_campo_2.sql',
];

async function run() {
  const conn = await getScriptConnection();
  console.log('Conectado!');

  for (const file of MIGRATIONS) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    await conn.query(sql);
    console.log(`✅ Aplicado: ${file}`);
  }

  await conn.end();
  console.log('Pronto! Todos os produtos novos foram inseridos.');
}

run().catch(console.error);
