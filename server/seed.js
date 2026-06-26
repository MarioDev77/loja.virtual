'use strict';
const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const conn = await mysql.createConnection({
    host: 'turntable.proxy.rlwy.net',
    port: 25473,
    user: 'root',
    password: 'dIcBzKUgMygTCzBuhxEabmsYeyOIijSf',
    database: 'railway',
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  });

  console.log('Conectado!');

  const schema = fs.readFileSync('./sql/schema.sql', 'utf8');
  await conn.query(schema);
  console.log('✅ schema ok');

  const seed = fs.readFileSync('./sql/seed_products.sql', 'utf8');
  await conn.query(seed);
  console.log('✅ seed ok');

  await conn.end();
  console.log('Pronto!');
}

run().catch(console.error);