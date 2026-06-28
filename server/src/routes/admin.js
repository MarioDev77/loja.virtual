'use strict';

/**
 * Rotas de administração.
 * Montado em /api/<ADMIN_ROUTE_PREFIX> (padrão: /manage)
 * Requer authJwt + requireRole('admin') em todo o router.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');

const { authJwt } = require('../middlewares/authJwt');
const { requireRole } = require('../middlewares/requireRole');
const { uploadImage, uploadImages, UPLOAD_DIR } = require('../middlewares/upload');
const { parsePositiveInt } = require('../utils/security');
const { pool } = require('../db/pool');

const router = express.Router();

// authJwt + requireRole em TODAS as rotas
router.use(authJwt, requireRole('admin'));

// ─── Schemas ──────────────────────────────────────────────────────────────────
const ProductSchema = z.object({
  name: z.string().min(2).max(200),
  brand: z.string().min(1).max(80),
  category: z.enum(['society', 'futsal', 'campo', 'tenis', 'blusas']),
  price: z.number().positive(),
  old_price: z.number().positive().nullable().optional(),
  // image_url: opcional quando há upload de arquivo
  image_url: z.string().url().max(500).optional(),
  description: z.string().min(1).max(2000),
  sizes_json: z.array(z.union([z.string(), z.number()])).min(1),
  stock_qty: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
  is_featured: z.boolean().optional().default(false),
  // ── Novos campos (etapa 6) — todos opcionais, não quebram payloads antigos ──
  sku: z.string().min(1).max(60).nullable().optional(),
  weight_grams: z.number().int().min(0).nullable().optional(),
  length_cm: z.number().positive().nullable().optional(),
  width_cm: z.number().positive().nullable().optional(),
  height_cm: z.number().positive().nullable().optional(),
});

const OrderStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'cancelled', 'refunded']),
});

// ─── Helper: resolve slug de categoria → category_id ─────────────────────────
// Schema usa products.category_id (FK) referenciando categories.id — não
// existe coluna "category" solta em products (ver server/sql/schema.sql).
// O slug já vem validado pelo z.enum no ProductSchema (whitelist fixa),
// então a query abaixo é apenas um lookup seguro, nunca SQL injection.
async function resolveCategoryId(slug) {
  const [rows] = await pool.query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug]);
  if (!rows[0]) {
    const err = new Error(`Category "${slug}" not found`);
    err.status = 422;
    throw err;
  }
  return rows[0].id;
}

// ─── Helper: parse body JSON de multipart ────────────────────────────────────
// Quando o upload vem como multipart/form-data os campos chegam como strings
function parseMultipartBody(body) {
  const out = { ...body };
  if (out.price) out.price = Number(out.price);
  if (out.old_price) out.old_price = out.old_price === 'null' ? null : Number(out.old_price);
  if (out.stock_qty) out.stock_qty = Number(out.stock_qty);
  if (out.is_active !== undefined) out.is_active = out.is_active === 'true' || out.is_active === '1';
  if (out.is_featured !== undefined) out.is_featured = out.is_featured === 'true' || out.is_featured === '1';
  if (out.sizes_json && typeof out.sizes_json === 'string') {
    try { out.sizes_json = JSON.parse(out.sizes_json); } catch { /* deixa falhar no zod */ }
  }
  // ── Novos campos numéricos (etapa 6) — vêm como string em multipart ──
  if (out.weight_grams !== undefined) out.weight_grams = out.weight_grams === '' || out.weight_grams === 'null' ? null : Number(out.weight_grams);
  if (out.length_cm !== undefined)    out.length_cm    = out.length_cm    === '' || out.length_cm    === 'null' ? null : Number(out.length_cm);
  if (out.width_cm !== undefined)     out.width_cm     = out.width_cm     === '' || out.width_cm     === 'null' ? null : Number(out.width_cm);
  if (out.height_cm !== undefined)    out.height_cm    = out.height_cm    === '' || out.height_cm    === 'null' ? null : Number(out.height_cm);
  if (out.sku === '') out.sku = null;
  return out;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const [[{ total_orders }]] = await pool.query('SELECT COUNT(*) AS total_orders FROM orders');
    const [[{ total_revenue }]] = await pool.query(
      "SELECT COALESCE(SUM(total_amount),0) AS total_revenue FROM orders WHERE status='paid'"
    );
    const [[{ total_products }]] = await pool.query(
      'SELECT COUNT(*) AS total_products FROM products WHERE is_active=1'
    );
    return res.json({ total_orders, total_revenue: Number(total_revenue), total_products });
  } catch (err) { return next(err); }
});

// ─── Upload de imagem avulso ──────────────────────────────────────────────────
// POST /api/<prefix>/uploads
// Retorna { url } para ser usada no campo image_url do produto
router.post('/uploads', uploadImage, (req, res) => {
  if (!req.uploadedFile)
    return res.status(400).json({ error: 'No image provided' });
  return res.status(201).json({ url: req.uploadedFile.url });
});

// ─── Produtos ─────────────────────────────────────────────────────────────────
router.get('/products', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.brand, c.slug AS category, p.price, p.old_price,
              p.image_url, p.stock_qty, p.is_active, p.is_featured
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return res.json({ products: rows });
  } catch (err) { return next(err); }
});

// ─── Helper: insere produto + linha inicial em product_images ───────────────
// Centraliza o INSERT (antes duplicado entre o branch multipart e o branch
// JSON puro) e já grava a imagem principal na galeria nova, mantendo
// image_url preenchida para compatibilidade com o front atual.
async function insertProduct(d, categoryId) {
  const [result] = await pool.execute(
    `INSERT INTO products
      (category_id, name, brand, price, old_price, image_url, description, sizes_json,
       stock_qty, is_active, is_featured, sku, weight_grams, length_cm, width_cm, height_cm)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      categoryId, d.name, d.brand, d.price, d.old_price ?? null, d.image_url,
      d.description, JSON.stringify(d.sizes_json), d.stock_qty, d.is_active ? 1 : 0, d.is_featured ? 1 : 0,
      d.sku ?? null, d.weight_grams ?? null, d.length_cm ?? null, d.width_cm ?? null, d.height_cm ?? null,
    ]
  );

  if (d.image_url) {
    await pool.execute(
      `INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES (?, ?, 0, 1)`,
      [result.insertId, d.image_url]
    );
  }

  return result.insertId;
}

// POST — suporta JSON puro (image_url) OU multipart/form-data (upload de arquivo)
router.post('/products', (req, res, next) => {
  const ct = req.headers['content-type'] || '';

  // Multipart: tem upload de imagem
  if (ct.includes('multipart/form-data')) {
    return uploadImage(req, res, async () => {
      try {
        const body = parseMultipartBody(req.body);
        if (req.uploadedFile) body.image_url = req.uploadedFile.url;

        const parsed = ProductSchema.safeParse(body);
        if (!parsed.success)
          return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

        const d = parsed.data;
        if (!d.image_url)
          return res.status(400).json({ error: 'image_url or image file required' });

        const categoryId = await resolveCategoryId(d.category);
        const id = await insertProduct(d, categoryId);
        return res.status(201).json({ id });
      } catch (err) { return next(err); }
    });
  }

  // JSON puro: image_url obrigatória no body
  return (async () => {
    try {
      const parsed = ProductSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

      const d = parsed.data;
      if (!d.image_url)
        return res.status(400).json({ error: 'image_url required' });

      const categoryId = await resolveCategoryId(d.category);
      const id = await insertProduct(d, categoryId);
      return res.status(201).json({ id });
    } catch (err) { return next(err); }
  })();
});

// PATCH — atualiza produto, com ou sem nova imagem
router.patch('/products/:id', (req, res, next) => {
  const ct = req.headers['content-type'] || '';

  const doUpdate = async (imageUrl) => {
    try {
      const id = parsePositiveInt(req.params.id, 'product id');

      const rawBody = ct.includes('multipart/form-data')
        ? parseMultipartBody(req.body)
        : req.body;
      if (imageUrl) rawBody.image_url = imageUrl;

      const parsed = ProductSchema.partial().safeParse(rawBody);
      if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

      const d = parsed.data;
      const fields = [];
      const values = [];

      if (d.name !== undefined)        { fields.push('name = ?');        values.push(d.name); }
      if (d.brand !== undefined)       { fields.push('brand = ?');       values.push(d.brand); }
      if (d.category !== undefined)    { fields.push('category_id = ?'); values.push(await resolveCategoryId(d.category)); }
      if (d.price !== undefined)       { fields.push('price = ?');       values.push(d.price); }
      if (d.old_price !== undefined)   { fields.push('old_price = ?');   values.push(d.old_price); }
      if (d.image_url !== undefined)   { fields.push('image_url = ?');   values.push(d.image_url); }
      if (d.description !== undefined) { fields.push('description = ?'); values.push(d.description); }
      if (d.sizes_json !== undefined)  { fields.push('sizes_json = ?');  values.push(JSON.stringify(d.sizes_json)); }
      if (d.stock_qty !== undefined)   { fields.push('stock_qty = ?');   values.push(d.stock_qty); }
      if (d.is_active !== undefined)   { fields.push('is_active = ?');   values.push(d.is_active ? 1 : 0); }
      if (d.is_featured !== undefined) { fields.push('is_featured = ?'); values.push(d.is_featured ? 1 : 0); }
      if (d.sku !== undefined)          { fields.push('sku = ?');          values.push(d.sku); }
      if (d.weight_grams !== undefined) { fields.push('weight_grams = ?'); values.push(d.weight_grams); }
      if (d.length_cm !== undefined)    { fields.push('length_cm = ?');    values.push(d.length_cm); }
      if (d.width_cm !== undefined)     { fields.push('width_cm = ?');     values.push(d.width_cm); }
      if (d.height_cm !== undefined)    { fields.push('height_cm = ?');    values.push(d.height_cm); }

      if (!fields.length)
        return res.status(400).json({ error: 'No fields to update' });

      values.push(id);
      const [result] = await pool.execute(
        `UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values
      );
      if (result.affectedRows === 0)
        return res.status(404).json({ error: 'Not found' });

      // Se subiu nova imagem, apaga a antiga do disco
      if (imageUrl) {
        const [[old]] = await pool.query('SELECT image_url FROM products WHERE id = ?', [id]);
        if (old?.image_url?.startsWith('/uploads/')) {
          const oldPath = path.join(UPLOAD_DIR, path.basename(old.image_url));
          fs.unlink(oldPath, () => {}); // silencia erros
        }

        // Sincroniza galeria: a imagem enviada via PATCH single-image passa a
        // ser a principal (compat com o fluxo antigo de 1 imagem por produto).
        await pool.execute('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [id]);
        await pool.execute(
          'INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES (?, ?, 0, 1)',
          [id, imageUrl]
        );
      }

      return res.json({ updated: true });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      return next(err);
    }
  };

  if (ct.includes('multipart/form-data')) {
    return uploadImage(req, res, () => doUpdate(req.uploadedFile?.url));
  }
  return doUpdate(undefined);
});

// ─── Galeria de imagens (etapa 6) ─────────────────────────────────────────────

// POST /manage/products/:id/images — sobe até 6 imagens e adiciona à galeria
// (não substitui as existentes; usar DELETE abaixo para remover uma específica)
router.post('/products/:id/images', uploadImages, async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, 'product id');

    const [[product]] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Not found' });

    if (!req.uploadedFiles || req.uploadedFiles.length === 0)
      return res.status(400).json({ error: 'No images provided' });

    // Próximo sort_order: continua a partir do que já existe na galeria
    const [[{ maxOrder }]] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM product_images WHERE product_id = ?',
      [id]
    );
    // Se o produto ainda não tem nenhuma imagem marcada como principal,
    // a primeira imagem enviada agora assume esse papel.
    const [[{ hasPrimary }]] = await pool.query(
      'SELECT COUNT(*) AS hasPrimary FROM product_images WHERE product_id = ? AND is_primary = 1',
      [id]
    );

    let nextOrder = Number(maxOrder) + 1;
    let primaryAssigned = Number(hasPrimary) > 0;
    const inserted = [];

    for (const file of req.uploadedFiles) {
      const makePrimary = !primaryAssigned;
      const [result] = await pool.execute(
        'INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES (?, ?, ?, ?)',
        [id, file.url, nextOrder, makePrimary ? 1 : 0]
      );
      if (makePrimary) {
        primaryAssigned = true;
        await pool.execute('UPDATE products SET image_url = ? WHERE id = ?', [file.url, id]);
      }
      inserted.push({ id: result.insertId, url: file.url, sortOrder: nextOrder, isPrimary: makePrimary });
      nextOrder += 1;
    }

    return res.status(201).json({ images: inserted });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// DELETE /manage/products/:id/images/:imageId — remove uma imagem da galeria
router.delete('/products/:id/images/:imageId', async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, 'product id');
    const imageId = parsePositiveInt(req.params.imageId, 'image id');

    const [[image]] = await pool.query(
      'SELECT id, url, is_primary FROM product_images WHERE id = ? AND product_id = ?',
      [imageId, id]
    );
    if (!image) return res.status(404).json({ error: 'Not found' });

    await pool.execute('DELETE FROM product_images WHERE id = ?', [imageId]);

    // Apaga o arquivo físico se for um upload (não apaga /seed-images, que é versionado)
    if (image.url?.startsWith('/uploads/')) {
      fs.unlink(path.join(UPLOAD_DIR, path.basename(image.url)), () => {});
    }

    // Se a imagem removida era a principal, promove a próxima da fila (se houver)
    if (image.is_primary) {
      const [[next]] = await pool.query(
        'SELECT id, url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
        [id]
      );
      if (next) {
        await pool.execute('UPDATE product_images SET is_primary = 1 WHERE id = ?', [next.id]);
        await pool.execute('UPDATE products SET image_url = ? WHERE id = ?', [next.url, id]);
      } else {
        await pool.execute('UPDATE products SET image_url = NULL WHERE id = ?', [id]);
      }
    }

    return res.json({ deleted: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// DELETE — soft delete
router.delete('/products/:id', async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, 'product id');
    const [result] = await pool.execute(
      'UPDATE products SET is_active = 0 WHERE id = ?', [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Not found' });
    return res.json({ deleted: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// ─── Pedidos ──────────────────────────────────────────────────────────────────
router.get('/orders', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT id, customer_name, email, payment_method, total_amount, status, created_at
       FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return res.json({ orders: rows });
  } catch (err) { return next(err); }
});

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, 'order id');
    const parsed = OrderStatusSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'Invalid status' });

    const newStatus = parsed.data.status;

    // Transação: lê status atual, atualiza, e só incrementa sold_qty na
    // transição PARA 'paid' que ainda não estava em 'paid' (evita duplo
    // incremento se o admin marcar 'paid' mais de uma vez).
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[order]] = await conn.query('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [id]);
      if (!order) {
        await conn.rollback();
        return res.status(404).json({ error: 'Not found' });
      }

      const wasAlreadyPaid = order.status === 'paid';

      await conn.execute('UPDATE orders SET status = ? WHERE id = ?', [newStatus, id]);

      if (newStatus === 'paid' && !wasAlreadyPaid) {
        const [items] = await conn.query(
          'SELECT product_id, qty FROM order_items WHERE order_id = ?',
          [id]
        );
        for (const item of items) {
          await conn.execute(
            'UPDATE products SET sold_qty = sold_qty + ? WHERE id = ?',
            [item.qty, item.product_id]
          );
        }
      }

      await conn.commit();
      return res.json({ updated: true });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// ─── Usuários ─────────────────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT id, name, username, email, phone, role, is_active, created_at
       FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return res.json({ users: rows });
  } catch (err) { return next(err); }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, 'user id');
    const parsed = z.object({ role: z.enum(['user', 'admin']) }).safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'Invalid role' });

    await pool.execute('UPDATE users SET role = ? WHERE id = ?', [parsed.data.role, id]);
    return res.json({ updated: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, 'user id');
    const parsed = z.object({ is_active: z.boolean() }).safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'Invalid payload' });

    await pool.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [parsed.data.is_active ? 1 : 0, id]
    );
    return res.json({ updated: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

module.exports = router;
