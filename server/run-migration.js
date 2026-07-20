'use strict';
// Roda um arquivo .sql qualquer, passado como argumento de linha de comando.
// Uso: node run-migration.js sql/etapa6_product_fields_and_images.sql
const fs = require('fs');
const path = require('path');
const { getScriptConnection } = require('./scripts/db-connection');

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node run-migration.js <caminho/do/arquivo.sql>');
    process.exit(1);
  }

  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`Arquivo não encontrado: ${fullPath}`);
    process.exit(1);
  }

  const conn = await getScriptConnection();
  console.log('Conectado!');

  const sql = fs.readFileSync(fullPath, 'utf8');
  await conn.query(sql);
  console.log(`✅ Migration aplicada: ${file}`);

  await conn.end();
}

run().catch((err) => {
  console.error('Erro ao aplicar migration:', err.message);
  process.exit(1);
});
