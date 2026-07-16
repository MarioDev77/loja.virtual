-- ============================================================
-- ETAPA 11 — Chuteiras de Campo (mais 4, peças únicas)
-- ============================================================
-- Categoria: campo (id 3). Todas peça única -> stock_qty = 1.
--
-- OBS: as fotos das duas "Copa" mostram "PREDATOR" escrito na chuteira
-- (não "Copa") — é o modelo Adidas Predator. Cadastrei com o nome real
-- que aparece na chuteira (Predator) pra não confundir o cliente na
-- hora da compra; o preço/tamanho que você passou continuam os mesmos.
-- ============================================================

USE pitch_futebol;

-- ── 1) Mizuno Morelia Neo 3 ────────────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Mizuno', 'Chuteira de Campo Mizuno Morelia Neo 3', 'chuteira-campo-mizuno-morelia-neo-3',
   450.00, NULL, 'BRL',
   '/seed-images/7c67d8d7ca48c0112e372c8277e9d55f.webp',
   'Chuteira de campo Mizuno Morelia Neo 3, cabedal em couro branco com detalhes em azul e rosa. Peça única no tamanho 41.',
   '["41"]', 1, 1, 1);

SET @id_mizuno = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_mizuno, '/seed-images/7c67d8d7ca48c0112e372c8277e9d55f.webp', 0, 1),
  (@id_mizuno, '/seed-images/7742cf18e281c090e9fcfe0dafaec04f.webp', 1, 0);

-- ── 2) Adidas Predator Rosa ────────────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Adidas', 'Chuteira de Campo Adidas Predator Rosa', 'chuteira-campo-adidas-predator-rosa',
   450.00, NULL, 'BRL',
   '/seed-images/2408801564f23a85ccf422dc03909e7c.webp',
   'Chuteira de campo Adidas Predator rosa/coral com detalhes prateados e sola iridescente. Peça única no tamanho 40.',
   '["40"]', 1, 0, 1);

SET @id_pred_rosa = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_pred_rosa, '/seed-images/2408801564f23a85ccf422dc03909e7c.webp', 0, 1),
  (@id_pred_rosa, '/seed-images/d431ce3800b990847f395ec7c906cc5a.webp', 1, 0);

-- ── 3) Adidas Predator Preta ───────────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Adidas', 'Chuteira de Campo Adidas Predator Preta', 'chuteira-campo-adidas-predator-preta',
   450.00, NULL, 'BRL',
   '/seed-images/47abeb62b975efaa012fb97e150d1dc3.webp',
   'Chuteira de campo Adidas Predator preta com detalhes brancos e vermelhos. Peça única no tamanho 43.',
   '["43"]', 1, 0, 1);

SET @id_pred_preta = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_pred_preta, '/seed-images/47abeb62b975efaa012fb97e150d1dc3.webp', 0, 1),
  (@id_pred_preta, '/seed-images/17e08d7b865fd8306b22af3bccffa8d3.webp', 1, 0);

-- ── 4) Adidas F50 Branca com Rosa (trava mista) ────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Adidas', 'Chuteira de Campo Adidas F50 Branca/Rosa', 'chuteira-campo-adidas-f50-branca-rosa',
   500.00, NULL, 'BRL',
   '/seed-images/6e3769274efad231c449d7485ce17d4d.webp',
   'Chuteira de campo Adidas F50 Hyperfast, branca com degradê coral/rosa e detalhes roxos, trava mista (multiterreno). Peça única no tamanho 41.',
   '["41"]', 1, 1, 1);

SET @id_f50 = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_f50, '/seed-images/6e3769274efad231c449d7485ce17d4d.webp', 0, 1),
  (@id_f50, '/seed-images/b1e3faa2f347c7560588290dbe54e972.webp', 1, 0);

-- ============================================================
-- Verificação pós-migration
-- ============================================================
-- SELECT id, name, price, sizes_json FROM products WHERE slug IN
--   ('chuteira-campo-mizuno-morelia-neo-3','chuteira-campo-adidas-predator-rosa',
--    'chuteira-campo-adidas-predator-preta','chuteira-campo-adidas-f50-branca-rosa');
