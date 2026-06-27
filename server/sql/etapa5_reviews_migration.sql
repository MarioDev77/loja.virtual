-- ============================================================
-- ETAPA 5 — Verificação da tabela reviews
-- ============================================================
-- A tabela reviews já existe no schema.sql com a estrutura correta,
-- incluindo UNIQUE KEY (product_id, user_id) e coluna updated_at.
-- Este arquivo só garante que o ambiente de produção está atualizado.
-- ============================================================

USE pitch_futebol;

-- Verifica se a tabela já existe com a estrutura esperada
SHOW CREATE TABLE reviews\G

-- Se a tabela não tiver a UNIQUE KEY uk_reviews_product_user,
-- execute o ALTER abaixo para adicioná-la:
--
-- ALTER TABLE reviews
--   ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
--   ADD UNIQUE KEY uk_reviews_product_user (product_id, user_id);
--
-- Se a tabela não existir, o schema.sql já a cria corretamente.
-- Verifique com: SHOW TABLES LIKE 'reviews';

-- Índice de performance para listagem pública por produto
-- (já existe no schema.sql, mas adicionamos com IF NOT EXISTS para segurança)
-- MySQL 8+:
-- CREATE INDEX IF NOT EXISTS idx_reviews_product_active
--   ON reviews (product_id, is_active, created_at DESC);
