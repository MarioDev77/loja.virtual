-- ============================================================
-- ETAPA 9 — Chuteiras Society (peças únicas, tamanho fixo em estoque)
-- ============================================================
--   1) Chuteira Society Nike Mamba          TAM 43     R$ 410,00
--   2) Chuteira Society Adidas F50          TAM 40,5   R$ 390,00
--   3) Chuteira Society Nike Mercurial      TAM 40     R$ 390,00
--   4) Chuteira Society Adidas Azul/Verde   TAM 37     R$ 299,00
--
-- Cada uma é peça única (só tem aquele tamanho em estoque),
-- por isso sizes_json tem um único valor e stock_qty = 1.
-- Categoria: society (id 1).
-- ============================================================

USE pitch_futebol;

-- ── 1) Chuteira Society Nike Mamba ────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (1, 'Nike', 'Chuteira Society Nike Mamba', 'chuteira-society-nike-mamba',
   410.00, NULL, 'BRL',
   '/seed-images/34fc2f6ebb6fe7993f28652fe28d252b.webp',
   'Chuteira society Nike Mamba, cabedal em malha com detalhes em verde. Trava baixa multitaco para gramado sintético. Peça única no tamanho 43.',
   '["43"]', 1, 1, 1);

SET @id_mamba = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_mamba, '/seed-images/34fc2f6ebb6fe7993f28652fe28d252b.webp', 0, 1),
  (@id_mamba, '/seed-images/5af211625f8625c0b6e71d92f7dd8ba8.webp', 1, 0);

-- ── 2) Chuteira Society Adidas F50 ────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (1, 'Adidas', 'Chuteira Society Adidas F50', 'chuteira-society-adidas-f50',
   390.00, NULL, 'BRL',
   '/seed-images/ee206baa34fbed37ddcb4908600e85fd.webp',
   'Chuteira society Adidas F50 branca com detalhes dourados. Solado texturizado para controle de bola em gramado sintético. Peça única no tamanho 40,5.',
   '["40,5"]', 1, 0, 1);

SET @id_f50 = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_f50, '/seed-images/ee206baa34fbed37ddcb4908600e85fd.webp', 0, 1),
  (@id_f50, '/seed-images/6aa5666e758db2c4bdc76d91dad979cf.webp', 1, 0);

-- ── 3) Chuteira Society Nike Mercurial ────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (1, 'Nike', 'Chuteira Society Nike Mercurial', 'chuteira-society-nike-mercurial',
   390.00, NULL, 'BRL',
   '/seed-images/54245e7ad9c436b2a0e72723dcc51c45.webp',
   'Chuteira society Nike Mercurial com cano alto (sock fit) para melhor ajuste no tornozelo. Solado com travas curtas para gramado sintético. Peça única no tamanho 40.',
   '["40"]', 1, 0, 1);

SET @id_merc = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_merc, '/seed-images/54245e7ad9c436b2a0e72723dcc51c45.webp', 0, 1),
  (@id_merc, '/seed-images/01c7972b8a98ba557f2995dc3ef13b95.webp', 1, 0);

-- ── 4) Chuteira Society Adidas Azul/Verde ─────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (1, 'Adidas', 'Chuteira Society Adidas Azul/Verde', 'chuteira-society-adidas-azul-verde',
   299.00, NULL, 'BRL',
   '/seed-images/71cf3642af2f77ff8d3e056bed09fca6.webp',
   'Chuteira society Adidas em azul marinho com detalhes em verde limão. Cabedal texturizado com bom custo-benefício. Peça única no tamanho 37.',
   '["37"]', 1, 0, 1);

SET @id_azul = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_azul, '/seed-images/71cf3642af2f77ff8d3e056bed09fca6.webp', 0, 1),
  (@id_azul, '/seed-images/ca273cbeaab4680561e71085baf50088.webp', 1, 0);

-- ============================================================
-- Verificação pós-migration
-- ============================================================
-- SELECT id, name, price, sizes_json, stock_qty FROM products WHERE slug IN
--   ('chuteira-society-nike-mamba','chuteira-society-adidas-f50',
--    'chuteira-society-nike-mercurial','chuteira-society-adidas-azul-verde');
