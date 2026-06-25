'use strict';

const express = require('express');
const { z } = require('zod');

const { listProducts, getProductById } = require('../services/products.service');
const { parsePositiveInt } = require('../utils/security');

const router = express.Router();

// ─── Parâmetros de query aceitos (whitelist) ──────────────────────────────────
const VALID_CATEGORIES = new Set(['all', 'society', 'futsal', 'campo', 'tenis', 'blusas']);
const VALID_SORT = new Set(['price_asc', 'price_desc', 'name_asc', 'newest']);

const ProductQuerySchema = z.object({
  category: z.string().max(40).optional(),
  sort: z.string().max(20).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ─── GET /api/products ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const parsed = ProductQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const { category, sort, page, limit } = parsed.data;

    // Whitelist de categoria — qualquer valor fora vira 'all'
    const safeCategory = VALID_CATEGORIES.has(category) ? category : 'all';

    // Whitelist de sort
    const safeSort = VALID_SORT.has(sort) ? sort : 'newest';

    const rows = await listProducts({ category: safeCategory, sort: safeSort, page, limit });
    return res.json({ products: rows });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    // parsePositiveInt lança 400 se id não for inteiro positivo válido
    const id = parsePositiveInt(req.params.id, 'product id');

    const product = await getProductById(id);
    if (!product) return res.status(404).json({ error: 'Not found' });

    return res.json({ product });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

module.exports = router;
