-- ============================================================
-- Migração: products.id → AUTO_INCREMENT
-- ============================================================
-- Use este script SOMENTE se o banco já foi criado antes desta correção
-- (ou seja, schema.sql já rodou uma vez e a tabela "products" já existe
-- sem AUTO_INCREMENT na coluna id).
--
-- Se você está criando o banco do zero, NÃO precisa rodar este arquivo —
-- basta rodar schema.sql + seed_products.sql normalmente, já corrigidos.
--
-- Como usar:
--   mysql -u <user> -p <database> < migration_products_auto_increment.sql
-- ============================================================

USE pitch_futebol;

ALTER TABLE products MODIFY id INT AUTO_INCREMENT;

-- Garante que o próximo INSERT automático não colida com nenhum ID já
-- existente na tabela (cobre tanto o seed padrão quanto produtos que você
-- já tenha cadastrado manualmente).
SET @next_id = (SELECT IFNULL(MAX(id), 0) + 1 FROM products);
SET @sql = CONCAT('ALTER TABLE products AUTO_INCREMENT = ', @next_id);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
