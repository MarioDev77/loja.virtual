-- ============================================================
-- ETAPA 13 — Remove todos os produtos de seed/demo do projeto
-- ============================================================
-- Objetivo: apagar do catálogo todos os produtos que vieram com o
-- projeto (inseridos pelas etapas 7, 9, 10, 11 e seed_products.sql),
-- mantendo intactos os produtos que o admin cadastrou pelo painel.
--
-- Critério: todo produto de seed usa imagem em /seed-images/ (pasta
-- versionada no git). Todo produto cadastrado pelo painel admin usa
-- imagem em /uploads/ (upload em runtime). Esse é o mesmo critério
-- que o próprio backend usa pra distinguir as duas origens
-- (ProductImageUrlSchema em server/src/routes/admin.js).
--
-- Os ARQUIVOS de imagem em server/seed-images/ NÃO são apagados —
-- só as linhas no banco de dados. Fica tudo versionado no git como
-- já estava, só não aparece mais no catálogo.
--
-- Reversível: se algum produto de seed for apagado por engano, dá
-- pra recriar rodando de novo o(s) arquivo(s) etapaN correspondente(s).
-- ============================================================

USE pitch_futebol;

-- Apaga avaliações dos produtos de seed primeiro (reviews não tem
-- FK com CASCADE, então precisa ser manual antes do DELETE em products).
DELETE r FROM reviews r
INNER JOIN products p ON p.id = r.product_id
WHERE p.image_url LIKE '/seed-images/%';

-- Apaga os produtos de seed. product_images é apagado automaticamente
-- via ON DELETE CASCADE (FK fk_product_images_product).
DELETE FROM products
WHERE image_url LIKE '/seed-images/%';

-- Confirma o resultado: deve mostrar só produtos com imagem em /uploads/
-- (os cadastrados pelo admin) — ou nenhuma linha, se ainda não tiver
-- cadastrado nenhum.
SELECT id, name, image_url FROM products ORDER BY id;
