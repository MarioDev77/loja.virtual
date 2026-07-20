-- ============================================================
-- ETAPA 6 — Campos extras de produto + galeria de imagens
-- ============================================================
-- Adiciona à tabela `products`:
--   sku           VARCHAR(60) UNIQUE NULL  — código interno do produto
--   weight_grams  INT UNSIGNED NULL        — peso em gramas (frete)
--   length_cm / width_cm / height_cm DECIMAL(6,2) NULL — dimensões (frete)
--   sold_qty      INT UNSIGNED NOT NULL DEFAULT 0 — qtd. total já vendida
--
-- Cria tabela nova `product_images` para múltiplas imagens por produto.
-- A coluna `products.image_url` é mantida (compatibilidade com o front
-- atual e com qualquer integração existente) e passa a ser sincronizada
-- com a imagem marcada como is_primary=1 em product_images.
--
-- Idempotente: seguro re-executar (usa IF NOT EXISTS / verificação manual
-- onde o MySQL não suporta ADD COLUMN IF NOT EXISTS nativamente em todas
-- as versões — ver nota abaixo).
-- ============================================================

USE pitch_futebol;

-- ── Novos campos em products ──────────────────────────────────────────────
-- Nota: a versão do MySQL do servidor não aceitou "ADD COLUMN IF NOT
-- EXISTS" (suportado só a partir do MySQL 8.0.29). Por isso cada coluna
-- é checada via information_schema antes de ser adicionada — mesmo
-- padrão já usado abaixo para o índice uk_products_sku.

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'sku'
);
SET @sql_col = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN sku VARCHAR(60) NULL',
  'SELECT "sku already exists"');
PREPARE stmt FROM @sql_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'weight_grams'
);
SET @sql_col = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN weight_grams INT UNSIGNED NULL',
  'SELECT "weight_grams already exists"');
PREPARE stmt FROM @sql_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'length_cm'
);
SET @sql_col = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN length_cm DECIMAL(6,2) NULL',
  'SELECT "length_cm already exists"');
PREPARE stmt FROM @sql_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'width_cm'
);
SET @sql_col = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN width_cm DECIMAL(6,2) NULL',
  'SELECT "width_cm already exists"');
PREPARE stmt FROM @sql_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'height_cm'
);
SET @sql_col = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN height_cm DECIMAL(6,2) NULL',
  'SELECT "height_cm already exists"');
PREPARE stmt FROM @sql_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'sold_qty'
);
SET @sql_col = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN sold_qty INT UNSIGNED NOT NULL DEFAULT 0',
  'SELECT "sold_qty already exists"');
PREPARE stmt FROM @sql_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- UNIQUE KEY em sku precisa ser adicionada separadamente (sintaxe
-- IF NOT EXISTS não cobre constraints em todas as versões do MySQL).
-- Roda em bloco protegido para não falhar se já existir.
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'products'
    AND index_name = 'uk_products_sku'
);
SET @sql_sku = IF(@idx_exists = 0,
  'ALTER TABLE products ADD UNIQUE KEY uk_products_sku (sku)',
  'SELECT "uk_products_sku already exists"');
PREPARE stmt FROM @sql_sku;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── Tabela de imagens múltiplas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE,

  INDEX idx_product_images_product_id (product_id),
  INDEX idx_product_images_sort (product_id, sort_order)
) ENGINE=InnoDB;

-- ── Backfill: migra image_url atual de cada produto para product_images ──
-- Garante que produtos já cadastrados não fiquem sem nenhuma linha em
-- product_images (a galeria nova teria que ter pelo menos a imagem atual).
INSERT INTO product_images (product_id, url, sort_order, is_primary)
SELECT p.id, p.image_url, 0, 1
FROM products p
WHERE p.image_url IS NOT NULL
  AND p.image_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id
  );

-- ============================================================
-- Verificação pós-migration
-- ============================================================
-- SHOW CREATE TABLE products\G
-- SHOW CREATE TABLE product_images\G
-- SELECT COUNT(*) FROM product_images;
