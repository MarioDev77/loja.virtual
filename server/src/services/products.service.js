'use strict';

const { pool } = require('../db/pool');

// Whitelist de categorias válidas
const VALID_CATS = new Set(['all', 'society', 'futsal', 'campo', 'tenis', 'blusas']);

// Whitelist de colunas para ORDER BY — evita SQL injection via sort param.
const SORT_MAP = {
  price_asc:  'p.price ASC',
  price_desc: 'p.price DESC',
  name_asc:   'p.name ASC',
  newest:     'p.id DESC',
};

// Colunas retornadas — explícitas (nunca SELECT *).
const PRODUCT_COLS = `
  p.id, p.name, p.brand, c.slug AS category, p.price, p.old_price,
  p.image_url AS image, p.description AS \`desc\`, p.sizes_json AS sizes
`;

const FROM_JOIN = `
  FROM products p
  INNER JOIN categories c ON c.id = p.category_id
`;

/**
 * Lista produtos com filtro de categoria, busca por nome, sort e paginação.
 * Retorna { products, total, hasMore } para o front controlar "carregar mais".
 * 100% parametrizado — sem interpolação de strings em SQL.
 */
async function listProducts({ category, sort = 'newest', q = '', page = 1, limit = 12 } = {}) {
  const cat      = (category || 'all').toString().trim();
  const useAll   = !VALID_CATS.has(cat) || cat === 'all';
  const useSearch = q && q.trim().length > 0;

  const orderClause = SORT_MAP[sort] || SORT_MAP.newest;
  const safePage    = Math.max(1, Number(page) || 1);
  const safeLimit   = Math.min(100, Math.max(1, Number(limit) || 12));
  const offset      = (safePage - 1) * safeLimit;

  // ── Monta cláusulas WHERE dinamicamente ─────────────────────────────────
  const conditions = ['p.is_active = 1'];
  const params     = [];

  if (!useAll) {
    conditions.push('c.slug = ?');
    params.push(cat);
  }

  if (useSearch) {
    // Escapa caracteres especiais do LIKE para evitar wildcards não intencionais
    const safeTerm = q.trim().replace(/[%_\\]/g, '\\$&');
    conditions.push('p.name LIKE ?');
    params.push(`%${safeTerm}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  // ── Count total (para o front saber se há mais páginas) ─────────────────
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total ${FROM_JOIN} ${where}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  // ── Dados paginados ──────────────────────────────────────────────────────
  const [rows] = await pool.query(
    `SELECT ${PRODUCT_COLS} ${FROM_JOIN} ${where} ORDER BY ${orderClause} LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    products: rows.map(mapProduct),
    total,
    hasMore: offset + rows.length < total,
  };
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
    id:       Number(r.id),
    name:     String(r.name  || ''),
    brand:    String(r.brand || ''),
    category: String(r.category || ''),
    price:    Number(r.price),
    oldPrice: r.old_price == null ? null : Number(r.old_price),
    image:    String(r.image || ''),
    desc:     String(r.desc  || ''),
    sizes,
  };
}

module.exports = { listProducts, getProductById };
