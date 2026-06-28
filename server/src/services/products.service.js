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
  p.image_url AS image, p.description AS \`desc\`, p.sizes_json AS sizes,
  p.sku, p.weight_grams, p.length_cm, p.width_cm, p.height_cm, p.sold_qty
`;

const FROM_JOIN = `
  FROM products p
  INNER JOIN categories c ON c.id = p.category_id
`;

// Subquery de galeria — agregada em JSON para vir em uma única query.
// COALESCE garante array vazio em vez de NULL quando não há linhas.
const IMAGES_SUBQUERY = `(
  SELECT COALESCE(
    JSON_ARRAYAGG(
      JSON_OBJECT('url', pi.url, 'isPrimary', pi.is_primary, 'sortOrder', pi.sort_order)
    ), JSON_ARRAY()
  )
  FROM (
    SELECT url, is_primary, sort_order
    FROM product_images
    WHERE product_id = p.id
    ORDER BY sort_order ASC, id ASC
  ) pi
) AS images_json`;

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
    `SELECT ${PRODUCT_COLS}, ${IMAGES_SUBQUERY} ${FROM_JOIN} ${where} ORDER BY ${orderClause} LIMIT ? OFFSET ?`,
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
    `SELECT ${PRODUCT_COLS}, ${IMAGES_SUBQUERY} ${FROM_JOIN} WHERE p.id = ? AND p.is_active = 1 LIMIT 1`,
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

  let images = [];
  try {
    // images_json já vem como array via JSON_ARRAYAGG; alguns drivers
    // retornam string, outros objeto já parseado — cobre os dois casos.
    images = typeof r.images_json === 'string' ? JSON.parse(r.images_json) : r.images_json;
    if (!Array.isArray(images)) images = [];
  } catch {
    images = [];
  }
  // Fallback: produto sem linha em product_images ainda usa a imagem única.
  if (images.length === 0 && r.image) {
    images = [{ url: r.image, isPrimary: true, sortOrder: 0 }];
  }

  return {
    id:       Number(r.id),
    name:     String(r.name  || ''),
    brand:    String(r.brand || ''),
    category: String(r.category || ''),
    price:    Number(r.price),
    oldPrice: r.old_price == null ? null : Number(r.old_price),
    image:    String(r.image || ''),
    images,
    desc:     String(r.desc  || ''),
    sizes,
    sku:          r.sku == null ? null : String(r.sku),
    weightGrams:  r.weight_grams == null ? null : Number(r.weight_grams),
    dimensions: (r.length_cm == null && r.width_cm == null && r.height_cm == null)
      ? null
      : {
          lengthCm: r.length_cm == null ? null : Number(r.length_cm),
          widthCm:  r.width_cm  == null ? null : Number(r.width_cm),
          heightCm: r.height_cm == null ? null : Number(r.height_cm),
        },
    soldQty: Number(r.sold_qty || 0),
  };
}

module.exports = { listProducts, getProductById };
