'use strict';

const express = require('express');
const { z } = require('zod');

const { listProducts, getProductById } = require('../services/products.service');
const { getReviewsByProduct, createReview } = require('../services/reviews.service');
const { parsePositiveInt } = require('../utils/security');
const { authJwt } = require('../middlewares/authJwt');

const router = express.Router();

// ─── Parâmetros de query aceitos (whitelist) ──────────────────────────────────
const VALID_CATEGORIES = new Set(['all', 'society', 'futsal', 'campo', 'tenis', 'blusas']);
const VALID_SORT = new Set(['price_asc', 'price_desc', 'name_asc', 'newest']);

const ProductQuerySchema = z.object({
  category: z.string().max(40).optional(),
  sort:     z.string().max(20).optional(),
  q:        z.string().max(100).optional(), // busca por nome (novo)
  page:     z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit:    z.coerce.number().int().min(1).max(100).optional().default(12),
});

// ─── GET /api/products ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const parsed = ProductQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const { category, sort, q, page, limit } = parsed.data;

    const safeCategory = VALID_CATEGORIES.has(category) ? category : 'all';
    const safeSort     = VALID_SORT.has(sort) ? sort : 'newest';

    const { products, total, hasMore } = await listProducts({
      category: safeCategory,
      sort:     safeSort,
      q:        q || '',
      page,
      limit,
    });

    return res.json({ products, total, hasMore, page, limit });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, 'product id');
    const product = await getProductById(id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    return res.json({ product });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// ─── GET /api/products/:id/reviews ───────────────────────────────────────────
// Rota pública — retorna avaliações aprovadas de um produto
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const id      = parsePositiveInt(req.params.id, 'product id');
    const page    = Math.max(1, Number(req.query.page)  || 1);
    const limit   = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    const reviews = await getReviewsByProduct(id, { page, limit });
    return res.json(reviews);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// ─── POST /api/products/:id/reviews ──────────────────────────────────────────
// Rota autenticada — cliente logado envia avaliação
const ReviewSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().min(3).max(800).optional(),
});

router.post('/:id/reviews', authJwt, async (req, res, next) => {
  try {
    const productId = parsePositiveInt(req.params.id, 'product id');

    const parsed = ReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.issues });
    }

    const review = await createReview({
      productId,
      userId:       req.user.id,
      nameSnapshot: req.user.name || 'Cliente',
      rating:       parsed.data.rating,
      comment:      parsed.data.comment || null,
    });

    return res.status(201).json({ review });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

module.exports = router;
