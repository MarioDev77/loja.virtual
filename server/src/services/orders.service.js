'use strict';

const { pool } = require('../db/pool');
const crypto = require('crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function normalizeCpf(cpfRaw) {
  return cpfRaw.replace(/[\.\-\s]/g, '');
}

/**
 * Cria pedido com recálculo de preços no servidor.
 *
 * SEGURANÇA:
 *  - unitPrice do cliente é IGNORADO — busca preço real no DB
 *  - Verifica estoque de cada item antes de inserir
 *  - total calculado pelo servidor (não confia no cliente)
 *  - CPF hasheado com pepper antes de persistir
 *  - Transação atômica com rollback em falha
 */
async function createOrder(payload, userId) {
  const { customer, address, payment, items } = payload;

  // ── 1. Buscar preços reais do DB ──────────────────────────────────────────
  const productIds = [...new Set(items.map((i) => i.productId))];

  // IN parametrizado — sem interpolação
  const placeholders = productIds.map(() => '?').join(',');
  const [dbProducts] = await pool.query(
    `SELECT id, name, brand, price, stock_qty, is_active FROM products WHERE id IN (${placeholders})`,
    productIds
  );

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  // ── 2. Validações de negócio ─────────────────────────────────────────────
  for (const item of items) {
    const prod = productMap.get(item.productId);

    if (!prod || !prod.is_active) {
      const err = new Error(`Product ${item.productId} not available`);
      err.status = 422;
      throw err;
    }

    if (prod.stock_qty < item.qty) {
      const err = new Error(`Insufficient stock for product ${item.productId}`);
      err.status = 422;
      throw err;
    }
  }

  // ── 3. Recalcula totais no servidor ───────────────────────────────────────
  let subtotal = 0;
  const enrichedItems = items.map((item) => {
    const prod = productMap.get(item.productId);
    const unitPrice = Number(prod.price); // preço real do DB
    const qty = Number(item.qty);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    return { ...item, unitPrice, qty, lineTotal, productNameSnapshot: prod.name, productBrandSnapshot: prod.brand };
  });

  const discountPercent = payment.method === 'pix' ? 5 : 0;
  const discountAmount = Number((subtotal * discountPercent / 100).toFixed(2));
  const total = Number((subtotal - discountAmount).toFixed(2));

  // ── 4. Hash do CPF ────────────────────────────────────────────────────────
  const cpfNorm = normalizeCpf(customer.cpf);
  const cpfHash = sha256(`${cpfNorm}:${process.env.CPF_PEPPER || 'dev_pepper'}`);

  // ── 5. Persistência em transação ──────────────────────────────────────────
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orderResult] = await conn.execute(
      `INSERT INTO orders
        (user_id, customer_name, customer_cpf_hash, email, phone,
         cep, street, number, complement, bairro, city, state,
         payment_method, subtotal_amount, discount_amount, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId ?? null,
        customer.name,
        cpfHash,
        customer.email,
        customer.phone,
        address.cep,
        address.street,
        address.number,
        address.complement ?? null,
        address.bairro,
        address.city,
        address.state,
        payment.method,
        subtotal,
        discountAmount,
        total,
      ]
    );

    const orderId = orderResult.insertId;

    for (const it of enrichedItems) {
      await conn.execute(
        `INSERT INTO order_items
          (order_id, product_id, product_name_snapshot, product_brand_snapshot, size, unit_price, qty, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          it.productId,
          it.productNameSnapshot,
          it.productBrandSnapshot,
          String(it.size),
          it.unitPrice,
          it.qty,
          it.lineTotal,
        ]
      );

      // Decrementa estoque atomicamente
      await conn.execute(
        'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?',
        [it.qty, it.productId, it.qty]
      );
    }

    await conn.commit();
    return orderId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * Busca pedido por ID — retorna também user_id para check IDOR no controller.
 */
async function getOrderByIdAndUser(orderId) {
  const [rows] = await pool.query(
    `SELECT o.id, o.user_id, o.customer_name, o.email, o.payment_method,
            o.subtotal_amount, o.discount_amount, o.total_amount, o.status, o.created_at,
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'productId', oi.product_id,
                'name', oi.product_name_snapshot,
                'size', oi.size,
                'unitPrice', oi.unit_price,
                'qty', oi.qty,
                'lineTotal', oi.line_total
              )
            ) AS items
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.id = ?
     GROUP BY o.id
     LIMIT 1`,
    [orderId]
  );
  if (!rows[0]) return null;

  const row = rows[0];
  let items = [];
  try { items = JSON.parse(row.items || '[]'); } catch { items = []; }

  return {
    id: Number(row.id),
    user_id: row.user_id,
    customerName: row.customer_name,
    email: row.email,
    paymentMethod: row.payment_method,
    subtotal: Number(row.subtotal_amount),
    discount: Number(row.discount_amount),
    total: Number(row.total_amount),
    status: row.status,
    createdAt: row.created_at,
    items,
  };
}

/**
 * Lista todos os pedidos (admin only — acesso controlado no controller).
 */
async function getAllOrders({ page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT id, customer_name, email, payment_method, total_amount, status, created_at
     FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [safeLimit, offset]
  );
  return rows;
}

module.exports = { createOrder, getOrderByIdAndUser, getAllOrders };
