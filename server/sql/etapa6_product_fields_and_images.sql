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
-- Nota: MySQL 8.0.29+ suporta "ADD COLUMN IF NOT EXISTS". Se sua versão
-- for anterior, remova o "IF NOT EXISTS" e rode uma vez só.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku VARCHAR(60) NULL,
  ADD COLUMN IF NOT EXISTS weight_grams INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS length_cm DECIMAL(6,2) NULL,
  ADD COLUMN IF NOT EXISTS width_cm DECIMAL(6,2) NULL,
  ADD COLUMN IF NOT EXISTS height_cm DECIMAL(6,2) NULL,
  ADD COLUMN IF NOT EXISTS sold_qty INT UNSIGNED NOT NULL DEFAULT 0;

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
