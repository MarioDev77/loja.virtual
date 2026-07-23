-- ============================================================
-- ETAPA 14 — Remove TODOS os produtos do catálogo (reset total)
-- ============================================================
-- Diferente da etapa 13 (que só removia os produtos de seed), esta
-- apaga ABSOLUTAMENTE TODOS os produtos — incluindo os cadastrados
-- pelo admin via painel. Uso: recomeçar o catálogo do zero.
--
-- Os ARQUIVOS de imagem (tanto server/seed-images/ quanto
-- server/uploads/) NÃO são apagados por este script — só as linhas
-- do banco. Se quiser limpar os arquivos de upload também, isso
-- precisa ser feito manualmente no servidor (fora do escopo do SQL).
--
-- Depois de rodar, o catálogo fica vazio e pronto pra você cadastrar
-- os produtos do zero pelo painel admin.
-- ============================================================

USE pitch_futebol;

-- Apaga todas as avaliações (reviews não tem FK com CASCADE).
DELETE FROM reviews;

-- Apaga todos os produtos. product_images é apagado automaticamente
-- via ON DELETE CASCADE (FK fk_product_images_product).
DELETE FROM products;

-- Reinicia o auto-incremento, pra o próximo produto cadastrado
-- começar do id 1 de novo.
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE product_images AUTO_INCREMENT = 1;
ALTER TABLE reviews AUTO_INCREMENT = 1;

-- Confirma o resultado: deve mostrar 0 produtos.
SELECT COUNT(*) AS produtos_restantes FROM products;
