-- ============================================================
-- ETAPA 16 — Adiciona a categoria 'Kits de Treino' (slug 'kits')
-- ============================================================
-- Não mexe em nenhuma categoria existente. Só insere uma nova
-- linha em `categories` para os produtos de kit de treino
-- (coletes, cones, escadas de agilidade, bolas de treino etc.)
-- poderem ser cadastrados no admin e aparecerem no carrossel
-- de categorias da home.
-- ============================================================

USE pitch_futebol;

INSERT INTO categories (slug, name, description, image_url)
VALUES ('kits', 'Kits de Treino', 'Kits e acessórios para treino de futebol', NULL)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);

-- Confirma o resultado.
SELECT id, slug, name, description FROM categories WHERE slug = 'kits';
