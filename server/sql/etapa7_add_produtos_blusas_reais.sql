-- ============================================================
-- ETAPA 7 — Novos produtos reais na categoria "Blusas"
-- ============================================================
-- Adiciona 3 produtos novos com fotos reais (já processadas e
-- copiadas para server/seed-images/):
--
--   1) Short Térmico              (TAM: P, G, 10 anos)  R$ 49,99
--   2) Kit Dryfit Premium         (TAM: M, G)            R$ 79,99
--   3) Regata Americana Canelada  (TAM: M, G)             R$ 59,99
--
-- Não usa IDs fixos (o painel admin e os produtos antigos já
-- usam auto_increment) — os IDs são obtidos com LAST_INSERT_ID()
-- logo após cada INSERT, evitando colisão com produtos existentes.
--
-- IMPORTANTE: antes de rodar este script, copie os arquivos .webp
-- da pasta seed-images para o servidor (git add + commit + push
-- do backend já resolve isso, pois seed-images é versionado no repo).
-- ============================================================

USE pitch_futebol;

-- ── 1) Short Térmico ───────────────────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (5, 'RA', 'Short Térmico Compressão', 'short-termico-compressao',
   49.99, NULL, 'BRL',
   '/seed-images/8af249b71608e7c6e4c9b71fecd3e78f.webp',
   'Short térmico de compressão, ideal para treinos, futebol e uso por baixo do uniforme. Tecido flexível de secagem rápida com cintura elástica emborrachada.',
   '["P","G","10 anos"]', 50, 1, 1);

SET @id_short = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_short, '/seed-images/8af249b71608e7c6e4c9b71fecd3e78f.webp', 0, 1),
  (@id_short, '/seed-images/a20e8771f85dd6ea018aa460353c1f79.webp', 1, 0),
  (@id_short, '/seed-images/69431b22424149610aafc25565307e9c.webp', 2, 0);

-- ── 2) Kit Dryfit Premium ──────────────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (5, 'Dryfit Premium', 'Kit Dryfit Premium (Camiseta + Shorts)', 'kit-dryfit-premium',
   79.99, NULL, 'BRL',
   '/seed-images/5ed2cb7d6514d4f7757562dbe3e2f35c.webp',
   'Conjunto camiseta + shorts em tecido dryfit leve e respirável, com secagem rápida. Ótimo para treino, corrida ou uso casual no dia a dia.',
   '["M","G"]', 50, 1, 1);

SET @id_kit = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_kit, '/seed-images/5ed2cb7d6514d4f7757562dbe3e2f35c.webp', 0, 1),
  (@id_kit, '/seed-images/4d2fb8e2ee8c7c55ef8e99cc203ea6ed.webp', 1, 0),
  (@id_kit, '/seed-images/cd478e38b70fb131f407df9b66e0425d.webp', 2, 0);

-- ── 3) Regata Americana Canelada ───────────────────────────────────────────
INSERT INTO products
  (category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (5, 'Grohe', 'Regata Americana Canelada', 'regata-americana-canelada',
   59.99, NULL, 'BRL',
   '/seed-images/643195832b07fa4be2b7765c0891e705.webp',
   'Regata americana em tecido canelado, corte justo e confortável. Disponível em várias cores. Perfeita para treino ou uso casual.',
   '["M","G"]', 80, 0, 1);

SET @id_regata = LAST_INSERT_ID();

INSERT INTO product_images (product_id, url, sort_order, is_primary) VALUES
  (@id_regata, '/seed-images/643195832b07fa4be2b7765c0891e705.webp', 0, 1),
  (@id_regata, '/seed-images/77835ed266fbde6e8000d601075924ae.webp', 1, 0),
  (@id_regata, '/seed-images/29bd4c8eabd3a25c4737a42fa3dc8048.webp', 2, 0),
  (@id_regata, '/seed-images/1d3981dca1e79f4685ef10917c51a650.webp', 3, 0),
  (@id_regata, '/seed-images/810df70003d2186b4bc2e3dc80111164.webp', 4, 0),
  (@id_regata, '/seed-images/db8a06a19b4ea2f718ec3345dd1e13e7.webp', 5, 0),
  (@id_regata, '/seed-images/6f9a1b12b8ed38ed9084c698c4df060a.webp', 6, 0),
  (@id_regata, '/seed-images/3a42e2c3ef011e2464f8fb44c92370f2.webp', 7, 0);

-- ============================================================
-- Verificação pós-migration
-- ============================================================
-- SELECT id, name, price, sizes_json FROM products WHERE slug IN
--   ('short-termico-compressao','kit-dryfit-premium','regata-americana-canelada');
-- SELECT * FROM product_images WHERE product_id IN (@id_short, @id_kit, @id_regata);
