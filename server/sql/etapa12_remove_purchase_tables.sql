-- etapa12_remove_purchase_tables.sql
--
-- Remove as tabelas relacionadas à funcionalidade de compra (carrinho/
-- checkout/pedidos), que foi retirada do projeto — a loja agora só tem
-- favoritos (wishlist), que é 100% client-side (localStorage), sem tabela
-- no banco.
--
-- Ordem de DROP respeita as foreign keys:
--   1) order_items      (FK -> orders)
--   2) stock_movements  (FK -> orders, nullable)
--   3) orders           (FK -> users, coupons)
--   4) coupons          (só era usado por orders)
--
-- Tabelas NÃO afetadas: users, categories, products, reviews.
-- A coluna products.sold_qty é mantida (histórico de vendas já ocorridas,
-- só não é mais incrementada — não fazia sentido apagar dado histórico).
--
-- ⚠️ Isso apaga permanentemente o histórico de pedidos já feitos no banco.
-- Se quiser manter esse histórico por qualquer motivo (auditoria, dados
-- fiscais), faça um backup/export antes de rodar este script.

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS coupons;
