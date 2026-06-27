-- ============================================================
-- ETAPA 1 — Desativar produtos sem imagem real no repositório
-- ============================================================
-- Os produtos IDs 13–20 (Tênis e Blusas) usam imagens do serviço
-- externo picsum.photos, que são placeholders aleatórios sem relação
-- com os produtos reais da loja.
--
-- Esta query os desativa (is_active = 0) para que deixem de aparecer
-- no catálogo público. Eles permanecem no banco e podem ser reativados
-- assim que imagens reais forem cadastradas pelo painel admin.
--
-- ANTES de executar, confirme o ambiente:
--   SELECT id, name, image_url FROM products WHERE id IN (13,14,15,16,17,18,19,20);
-- ============================================================

USE pitch_futebol;

-- Verificação prévia (rode primeiro para conferir)
SELECT
  id,
  name,
  category_id,
  SUBSTRING(image_url, 1, 60) AS image_url_preview,
  is_active
FROM products
WHERE id IN (13, 14, 15, 16, 17, 18, 19, 20)
ORDER BY id;

-- Desativação (execute após confirmar os dados acima)
UPDATE products
SET
  is_active  = 0,
  updated_at = NOW()
WHERE id IN (13, 14, 15, 16, 17, 18, 19, 20);

-- Confirmação pós-update
SELECT
  id,
  name,
  is_active,
  updated_at
FROM products
WHERE id IN (13, 14, 15, 16, 17, 18, 19, 20)
ORDER BY id;

-- ============================================================
-- Para REATIVAR um produto específico quando tiver imagem real:
--
--   UPDATE products
--   SET image_url = '/uploads/nome-do-arquivo.webp',
--       is_active = 1,
--       updated_at = NOW()
--   WHERE id = <ID_DO_PRODUTO>;
-- ============================================================
