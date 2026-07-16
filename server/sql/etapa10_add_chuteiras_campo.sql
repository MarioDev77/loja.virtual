-- ============================================================
-- ETAPA 10 — Chuteiras de Campo (peças únicas, tamanho fixo em estoque)
-- ============================================================
-- Categoria: campo (id 3).
-- Todas peça única no tamanho informado -> sizes_json com 1 valor e
-- stock_qty = 1 (baixa o estoque manualmente pelo admin quando vender).
--
-- ATENÇÃO: "Puma Ultra" entrou com is_active = 0 e price = 0.00 porque
-- o valor é "sob consulta" — o preço no banco não pode ser nulo. Antes
-- de ativar esse produto, edite o preço real pelo painel admin e depois
-- marque is_active = 1 (ou deixe como está e trate a venda só por
-- WhatsApp/contato direto, sem listar no catálogo).
-- ============================================================

USE pitch_futebol;

-- ── 1) Puma Ultra (valor sob consulta) ────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Puma', 'Chuteira de Campo Puma Ultra', 'chuteira-campo-puma-ultra',
   0.00, NULL, 'BRL',
   '/seed-images/8c56bc9676ecd4cbd8a13f76e1fdc3ca.webp',
   'Chuteira de campo Puma Ultra, estampa laranja/roxo com detalhes "FTR". Peça única no tamanho 38. Valor sob consulta — entre em contato antes de comprar.',
   '["38"]', 1, 0, 0);

SET @id_puma = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_puma, '/seed-images/8c56bc9676ecd4cbd8a13f76e1fdc3ca.webp', 0, 1),
  (@id_puma, '/seed-images/d0bdc77b8062c6aa5d7b0bbdb3300203.webp', 1, 0);

-- ── 2) Mercurial Air Zoom Branca ───────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Nike', 'Chuteira de Campo Nike Mercurial Air Zoom Branca', 'chuteira-campo-mercurial-air-zoom-branca',
   450.00, NULL, 'BRL',
   '/seed-images/0cdc70347ac748ef6b973ba553fb4da7.webp',
   'Chuteira de campo Nike Mercurial com tecnologia Air Zoom no calcanhar, branca com detalhes dourados/vermelhos. Peça única no tamanho 39.',
   '["39"]', 1, 1, 1);

SET @id_merc_branca = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_merc_branca, '/seed-images/0cdc70347ac748ef6b973ba553fb4da7.webp', 0, 1),
  (@id_merc_branca, '/seed-images/8df2fe8ee9f5f94ee84b61ead2547148.webp', 1, 0);

-- ── 3) Mercurial Preta ─────────────────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Nike', 'Chuteira de Campo Nike Mercurial Preta', 'chuteira-campo-mercurial-preta',
   420.00, NULL, 'BRL',
   '/seed-images/8b0878ee27a6830b093f19a4a7284098.webp',
   'Chuteira de campo Nike Mercurial toda preta (blackout), visual discreto e travas metálicas. Peça única no tamanho 40.',
   '["40"]', 1, 0, 1);

SET @id_merc_preta = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_merc_preta, '/seed-images/8b0878ee27a6830b093f19a4a7284098.webp', 0, 1),
  (@id_merc_preta, '/seed-images/37cc5e04deb9acfc745fc4bdb26f5b36.webp', 1, 0);

-- ── 4) Phantom Branca com Vermelho ─────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Nike', 'Chuteira de Campo Nike Phantom Branca/Vermelha', 'chuteira-campo-phantom-branca-vermelha',
   420.00, NULL, 'BRL',
   '/seed-images/3daa55b1479597b6cbb0b7f7414242ac.webp',
   'Chuteira de campo Nike Phantom, colorway branca/azul clara com laranja e vermelho no cabedal. Peça única no tamanho 40.',
   '["40"]', 1, 0, 1);

SET @id_phantom_bv = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_phantom_bv, '/seed-images/3daa55b1479597b6cbb0b7f7414242ac.webp', 0, 1),
  (@id_phantom_bv, '/seed-images/e4a5514a0cffc75dc3d76b6ce316dcc8.webp', 1, 0);

-- ── 5) Mercurial Vapor 16 Bege com Azul ─────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Nike', 'Chuteira de Campo Nike Mercurial Vapor 16 Bege/Azul', 'chuteira-campo-mercurial-vapor16-bege-azul',
   420.00, NULL, 'BRL',
   '/seed-images/b29d9f630e3ce121473a673b603b3a01.webp',
   'Chuteira de campo Nike Mercurial Vapor 16, colorway bege/off-white com detalhes em azul. Peça única no tamanho 40.',
   '["40"]', 1, 0, 1);

SET @id_vapor_bege = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_vapor_bege, '/seed-images/b29d9f630e3ce121473a673b603b3a01.webp', 0, 1),
  (@id_vapor_bege, '/seed-images/2f93edba8c387b89cc9c54cd4b556b04.webp', 1, 0);

-- ── 6) Phantom Mamba ───────────────────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Nike', 'Chuteira de Campo Nike Phantom Mamba', 'chuteira-campo-phantom-mamba',
   450.00, NULL, 'BRL',
   '/seed-images/c20cf4ba369bec5703d322663f23f16b.webp',
   'Chuteira de campo Nike edição Mamba, cabedal creme/preto com logo da cobra e solado iridescente. Peça única no tamanho 40.',
   '["40"]', 1, 1, 1);

SET @id_mamba = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_mamba, '/seed-images/c20cf4ba369bec5703d322663f23f16b.webp', 0, 1),
  (@id_mamba, '/seed-images/96d0ed6111e4286c888d89ad7ace9462.webp', 1, 0);

-- ── 7) Adidas Predator Branca ───────────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Adidas', 'Chuteira de Campo Adidas Predator Branca', 'chuteira-campo-adidas-predator-branca',
   420.00, NULL, 'BRL',
   '/seed-images/f44dc53c2d1694012fa01fa0c1dfc3c9.webp',
   'Chuteira de campo Adidas Predator sem cadarço aparente, branca com desenhos geométricos pretos e sola degradê laranja/amarelo. Peça única no tamanho 41.',
   '["41"]', 1, 0, 1);

SET @id_predator = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_predator, '/seed-images/f44dc53c2d1694012fa01fa0c1dfc3c9.webp', 0, 1),
  (@id_predator, '/seed-images/1fe149741cbed333795aa1d227776e00.webp', 1, 0);

-- ── 8) Mercurial Kylian Mbappé ───────────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Nike', 'Chuteira de Campo Nike Mercurial Edição Mbappé', 'chuteira-campo-mercurial-mbappe',
   420.00, NULL, 'BRL',
   '/seed-images/30fde4944edee535ecd587c7d5c8aaef.webp',
   'Chuteira de campo Nike Mercurial, colorway roxa com detalhes dourados e logo "KM". Peça única no tamanho 41.',
   '["41"]', 1, 1, 1);

SET @id_mbappe = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_mbappe, '/seed-images/30fde4944edee535ecd587c7d5c8aaef.webp', 0, 1),
  (@id_mbappe, '/seed-images/812f7d08c451848e7983c657dfc8e39e.webp', 1, 0);

-- ── 9) Mercurial Vapor 16 Laranja com Branco ────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (3, 'Nike', 'Chuteira de Campo Nike Mercurial Vapor 16 Laranja/Branca', 'chuteira-campo-mercurial-vapor16-laranja-branca',
   420.00, NULL, 'BRL',
   '/seed-images/5a0345b0da7d3702c2069230257df231.webp',
   'Chuteira de campo Nike Mercurial Vapor 16, colorway branca/cinza com estampa "safari" em laranja e preto. Peça única no tamanho 41.',
   '["41"]', 1, 0, 1);

SET @id_vapor_laranja = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_vapor_laranja, '/seed-images/5a0345b0da7d3702c2069230257df231.webp', 0, 1),
  (@id_vapor_laranja, '/seed-images/a2cc52074f85beb57a90f0e72a74e75e.webp', 1, 0);

-- ============================================================
-- Verificação pós-migration
-- ============================================================
-- SELECT id, name, price, sizes_json, is_active FROM products WHERE slug IN
--   ('chuteira-campo-puma-ultra','chuteira-campo-mercurial-air-zoom-branca',
--    'chuteira-campo-mercurial-preta','chuteira-campo-phantom-branca-vermelha',
--    'chuteira-campo-mercurial-vapor16-bege-azul','chuteira-campo-phantom-mamba',
--    'chuteira-campo-adidas-predator-branca','chuteira-campo-mercurial-mbappe',
--    'chuteira-campo-mercurial-vapor16-laranja-branca');
