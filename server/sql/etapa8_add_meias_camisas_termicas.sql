-- ============================================================
-- ETAPA 8 — Meias antiderrapantes + Camisas/Regatas térmicas c/ frases
-- ============================================================
--   1) Meias Antiderrapantes Jcolour       (tam. único, calçado 40-46)  R$ 25,00
--   2) Camisa e Regata Térmica (c/ frases) (TAM: M, G)                  R$ 99,99
--
-- Sem IDs fixos — usa LAST_INSERT_ID() para não colidir com produtos
-- já existentes (antigos ou cadastrados pelo painel admin).
-- ============================================================

USE pitch_futebol;

-- ── 1) Meias Antiderrapantes Jcolour ──────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (5, 'Jcolour', 'Meias Antiderrapantes Jcolour', 'meias-antiderrapantes-jcolour',
   25.00, NULL, 'BRL',
   '/seed-images/62c2513e014736981b80ba5d38019a03.webp',
   'Meia de cano alto com solado antiderrapante (grip), ideal para futebol, futsal e treinos. Disponível em branco e preto.',
   '["Único (calçado 40 ao 46)"]', 100, 1, 1);

SET @id_meia = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_meia, '/seed-images/62c2513e014736981b80ba5d38019a03.webp', 0, 1),
  (@id_meia, '/seed-images/2398321f5cf5145f7d679bf9bda2d20d.webp', 1, 0),
  (@id_meia, '/seed-images/51b3eaaf632fd40d00db5336d8f68b97.webp', 2, 0);

-- ── 2) Camisa e Regata Térmica (com frases) ───────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (5, 'RA', 'Camisa e Regata Térmica com Frases', 'camisa-regata-termica-frases',
   99.99, NULL, 'BRL',
   '/seed-images/c5c2afbe8528093f80450510140e942e.webp',
   'Camisas e regatas térmicas com estampas de frases. Tecido térmico de compressão, ótimo para treino e uso no dia a dia. Estampas variadas — confira as fotos.',
   '["M","G"]', 60, 1, 1);

SET @id_camisa = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_camisa, '/seed-images/c5c2afbe8528093f80450510140e942e.webp', 0, 1),
  (@id_camisa, '/seed-images/690d60de32f442f32d47f36d55f70cbe.webp', 1, 0),
  (@id_camisa, '/seed-images/891fed9fa0fc3699902e047a45f38396.webp', 2, 0),
  (@id_camisa, '/seed-images/c718fd9d4c781206bcdb90f40250f824.webp', 3, 0),
  (@id_camisa, '/seed-images/bfc5d4b63f9690f8ef65843cb070e89f.webp', 4, 0),
  (@id_camisa, '/seed-images/a676067274347c0119a0f25276f19813.webp', 5, 0),
  (@id_camisa, '/seed-images/9fa9d18d229f195d879608c9508cfb6e.webp', 6, 0),
  (@id_camisa, '/seed-images/3372daeb98ed9991d17364d3c582e3be.webp', 7, 0),
  (@id_camisa, '/seed-images/6c302a423b73f65a3065e0e6338e721f.webp', 8, 0),
  (@id_camisa, '/seed-images/09ed0990f38661702cb772bec5e6bc64.webp', 9, 0);

-- ============================================================
-- Verificação pós-migration
-- ============================================================
-- SELECT id, name, price, sizes_json FROM products WHERE slug IN
--   ('meias-antiderrapantes-jcolour','camisa-regata-termica-frases');
