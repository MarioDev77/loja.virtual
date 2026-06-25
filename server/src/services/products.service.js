'use strict';

const { pool } = require('../db/pool');

// Whitelist de categorias válidas (slugs da tabela categories) — nunca
// interpoladas em SQL.
const VALID_CATS = new Set(['all', 'society', 'futsal', 'campo', 'tenis', 'blusas']);

// Whitelist de colunas para ORDER BY — evita SQL injection via sort param.
// Sempre referenciadas via p. (tabela products) para evitar ambiguidade
// no JOIN com categories.
const SORT_MAP = {
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  name_asc: 'p.name ASC',
  newest: 'p.id DESC',
};

// Colunas retornadas — explícitas (nunca SELECT *).
// category vem de categories.slug via JOIN (schema usa products.category_id
// como FK para categories.id — não existe coluna "category" solta na tabela
// products; ver server/sql/schema.sql).
const PRODUCT_COLS = `
  p.id, p.name, p.brand, c.slug AS category, p.price, p.old_price,
  p.image_url AS image, p.description AS \`desc\`, p.sizes_json AS sizes
`;

const FROM_JOIN = `
  FROM products p
  INNER JOIN categories c ON c.id = p.category_id
`;

/**
 * Lista produtos com filtro de categoria, sort e paginação.
 * 100% parametrizado — sem interpolação de strings em SQL.
 */
async function listProducts({ category, sort = 'newest', page = 1, limit = 20 } = {}) {
  const cat = (category || 'all').toString().trim();
  const useAll = !VALID_CATS.has(cat) || cat === 'all';

  // ORDER BY só aceita valores da whitelist
  const orderClause = SORT_MAP[sort] || SORT_MAP.newest;

  // Paginação segura
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;

  let sql, params;

  if (useAll) {
    // Sem filtro de categoria — slug não é interpolado
    sql = `SELECT ${PRODUCT_COLS} ${FROM_JOIN} WHERE p.is_active = 1 ORDER BY ${orderClause} LIMIT ? OFFSET ?`;
    params = [safeLimit, offset];
  } else {
    // Slug da categoria como parâmetro bind — nunca interpolado
    sql = `SELECT ${PRODUCT_COLS} ${FROM_JOIN} WHERE p.is_active = 1 AND c.slug = ? ORDER BY ${orderClause} LIMIT ? OFFSET ?`;
    params = [cat, safeLimit, offset];
  }

  const [rows] = await pool.query(sql, params);

  return rows.map(mapProduct);
}

/**
 * Busca produto por ID (inteiro positivo já validado no controller).
 */
async function getProductById(id) {
  const [rows] = await pool.query(
    `SELECT ${PRODUCT_COLS} ${FROM_JOIN} WHERE p.id = ? AND p.is_active = 1 LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  return mapProduct(rows[0]);
}

// ─── Mapper seguro ─────────────────────────────────────────────────────────────
function mapProduct(r) {
  let sizes = [];
  try {
    sizes = JSON.parse(r.sizes || '[]');
    if (!Array.isArray(sizes)) sizes = [];
  } catch {
    sizes = [];
  }

  return {
    id: Number(r.id),
    name: String(r.name || ''),
    brand: String(r.brand || ''),
    category: String(r.category || ''),
    price: Number(r.price),
    oldPrice: r.old_price == null ? null : Number(r.old_price),
    image: String(r.image || ''),
    desc: String(r.desc || ''),
    sizes,
  };
}

module.exports = { listProducts, getProductById };
