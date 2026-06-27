'use strict';

const { pool } = require('../db/pool');

/**
 * Retorna avaliações ativas de um produto, paginadas.
 * Inclui média de rating e total de reviews para exibir no front.
 */
async function getReviewsByProduct(productId, { page = 1, limit = 5 } = {}) {
  const safePage  = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 5));
  const offset    = (safePage - 1) * safeLimit;

  const [[{ total, avg }]] = await pool.query(
    `SELECT COUNT(*) AS total, ROUND(AVG(rating), 1) AS avg
     FROM reviews
     WHERE product_id = ? AND is_active = 1`,
    [productId]
  );

  const [rows] = await pool.query(
    `SELECT id, name_snapshot AS name, rating, comment,
            DATE_FORMAT(created_at, '%d/%m/%Y') AS date
     FROM reviews
     WHERE product_id = ? AND is_active = 1
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [productId, safeLimit, offset]
  );

  return {
    reviews: rows,
    total:   Number(total),
    avg:     avg ? Number(avg) : null,
    hasMore: offset + rows.length < Number(total),
  };
}

/**
 * Cria ou atualiza avaliação de um usuário para um produto.
 * A tabela tem UNIQUE KEY (product_id, user_id), então usa INSERT ... ON DUPLICATE KEY UPDATE
 * para que o cliente possa editar sua avaliação sem gerar erro 500.
 */
async function createReview({ productId, userId, nameSnapshot, rating, comment }) {
  // Verifica se o produto existe e está ativo
  const [[product]] = await pool.query(
    'SELECT id FROM products WHERE id = ? AND is_active = 1 LIMIT 1',
    [productId]
  );
  if (!product) {
    const err = new Error('Produto não encontrado');
    err.status = 404;
    throw err;
  }

  await pool.query(
    `INSERT INTO reviews (product_id, user_id, name_snapshot, rating, comment, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, NOW())
     ON DUPLICATE KEY UPDATE
       rating        = VALUES(rating),
       comment       = VALUES(comment),
       name_snapshot = VALUES(name_snapshot),
       is_active     = 1,
       updated_at    = NOW()`,
    [productId, userId, nameSnapshot, rating, comment]
  );

  const [[review]] = await pool.query(
    `SELECT id, name_snapshot AS name, rating, comment,
            DATE_FORMAT(created_at, '%d/%m/%Y') AS date
     FROM reviews
     WHERE product_id = ? AND user_id = ?`,
    [productId, userId]
  );

  return review;
}

module.exports = { getReviewsByProduct, createReview };
