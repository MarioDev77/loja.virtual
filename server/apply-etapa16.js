'use strict';
// Aplica a migration da ETAPA 16 (adiciona a categoria 'Kits de Treino',
// slug 'kits' — nenhuma categoria existente é alterada).
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

async function run() {
  const conn = await getScriptConnection();
  console.log('Conectado!');

  const sql = fs.readFileSync(path.join(__dirname, 'sql/etapa16_add_categoria_kits_treino.sql'), 'utf8');
  const [results] = await conn.query(sql);

  const lastResult = Array.isArray(results) ? results[results.length - 1] : results;
  console.log('✅ Etapa 16 aplicada — categoria "Kits de Treino" criada/atualizada.');
  console.table(lastResult);

  await conn.end();
}

run().catch(console.error);
