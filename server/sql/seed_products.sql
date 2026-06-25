USE pitch_futebol;

-- ============================================================
-- Seed: categorias + produtos + cupons
-- ============================================================

-- Categorias (slug -> nome compatível com o front atual)
INSERT INTO categories (id, slug, name, description, image_url)
VALUES
  (1,'society','Society', 'Chuteiras para gramado sintético', NULL),
  (2,'futsal','Futsal', 'Chuteiras para quadra de futsal', NULL),
  (3,'campo','Campo', 'Chuteiras para gramado natural', NULL),
  (4,'tenis','Tênis', 'Tênis para street e dia a dia', NULL),
  (5,'blusas','Blusas', 'Moda esportiva (blusas)', NULL)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), name=VALUES(name), description=VALUES(description), image_url=VALUES(image);

-- Produtos (mapeando do seed antigo; inclui stock_qty e is_featured)
-- Observação: sizes_json pode vir como números ou string JSON.
INSERT INTO products
  (id, category_id, brand, name, slug, price, old_price, currency, image_url, description, sizes_json, stock_qty, is_featured, is_active)
VALUES
  (1,1,'Nike','Nike Mercurial Superfly Society','nike-mercurial-superfly-society',599.90,749.90,'BRL','https://picsum.photos/seed/nikesociety1/600/600.jpg','Chuteira society com cabedal em malha encapsulada e solado de borracha para gramado sintético. Tecnologia Flyknit para ajuste superior.','[38,39,40,41,42,43,44]',120,1,1),
  (2,1,'Adidas','Adidas Predator Edge Society','adidas-predator-edge-society',549.90,NULL,'BRL','https://picsum.photos/seed/adipredsociety/600/600.jpg','Elementos de controle de bola em borracha texturizada. Cabedal em couro sintético premium para society.','[38,39,40,41,42,43]',90,0,1),
  (3,1,'Puma','Puma Future Z Society','puma-future-z-society',479.90,599.90,'BRL','https://picsum.photos/seed/pumafutsoc/600/600.jpg','Design dinâmico com FUZIONFIT+ para ajuste compressivo. Ideal para jogadores criativos no society.','[39,40,41,42,43,44]',70,0,1),
  (4,1,'Nike','Nike Phantom GX Society','nike-phantom-gx-society',529.90,NULL,'BRL','https://picsum.photos/seed/nikephantomsoc/600/600.jpg','Gripknit no cabedal para toque de bola excepcional. Perfeita para armadores no society.','[38,39,40,41,42,43,44]',60,1,1),

  (5,2,'Nike','Nike Tiempo Legend Futsal','nike-tiempo-legend-futsal',649.90,849.90,'BRL','https://picsum.photos/seed/niketiempofut/600/600.jpg','Couro legítimo macio para toque premium. Solado liso para quadra de futsal com amortecimento responsivo.','[38,39,40,41,42,43,44]',80,1,1),
  (6,2,'Adidas','Adidas Copa Pure Futsal','adidas-copa-pure-futsal',599.90,NULL,'BRL','https://picsum.photos/seed/adicopafut/600/600.jpg','Couro sintético Striker Upper para toque de bola excepcional. Design clássico para o futsal.','[39,40,41,42,43]',55,0,1),
  (7,2,'Joma','Joma Super Regate Futsal','joma-super-regate-futsal',319.90,399.90,'BRL','https://picsum.photos/seed/jomaregate/600/600.jpg','Excelente custo-benefício para futsal. Cabedal em couro sintético flexível com solado de borracha liso.','[38,39,40,41,42,43,44]',40,0,1),
  (8,2,'Mizuno','Mizuno Morelia Neo Futsal','mizuno-morelia-neo-futsal',699.90,NULL,'BRL','https://picsum.photos/seed/mizumorelia/600/600.jpg','Couro cachemira ultra leve. A mais premium das chuteiras de futsal para jogadores exigentes.','[39,40,41,42,43]',30,1,1),

  (9,3,'Nike','Nike Mercurial Vapor Campo','nike-mercurial-vapor-campo',899.90,1099.90,'BRL','https://picsum.photos/seed/mercvaporcamp/600/600.jpg','Chuteira de campo com travas metálicas para gramado natural. Velocidade máxima com cabedal em Flyknit.','[38,39,40,41,42,43,44]',25,1,1),
  (10,3,'Adidas','Adidas X Speedportal Campo','adidas-x-speedportal-campo',849.90,NULL,'BRL','https://picsum.photos/seed/adixspeed/600/600.jpg','Para jogadores rápidos. Características SPEEDSKIN e travas de alumínio para performance em campo natural.','[39,40,41,42,43]',35,0,1),
  (11,3,'Puma','Puma Ultra Ultimate Campo','puma-ultra-ultimate-campo',799.90,999.90,'BRL','https://picsum.photos/seed/pumaultracamp/600/600.jpg','Ultra leve com tecnologia PWRTAPE para estabilidade. Travas em alumínio para gramado natural.','[38,39,40,41,42,43,44]',20,0,1),
  (12,3,'Nike','Nike Phantom Luna Campo','nike-phantom-luna-campo',949.90,NULL,'BRL','https://picsum.photos/seed/phantomluna/600/600.jpg','Precisão e controle em campo natural. Gripknit 3.0 com travas côncavas para giro e mudança de direção.','[39,40,41,42,43,44]',15,1,1),

  (13,4,'Nike','Nike Air Max 90','nike-air-max-90',799.90,949.90,'BRL','https://picsum.photos/seed/airmax90x/600/600.jpg','Clássico do streetwear com amortecimento Air visível. Perfeito para o dia a dia com estilo esportivo.','[38,39,40,41,42,43,44]',60,0,1),
  (14,4,'Adidas','Adidas Samba OG','adidas-samba-og',549.90,NULL,'BRL','https://picsum.photos/seed/sambaogx/600/600.jpg','O tênis que nasceu no campo e dominou as ruas. Couro premium com solado em borracha gum.','[38,39,40,41,42,43,44]',55,1,1),
  (15,4,'New Balance','New Balance 550','new-balance-550',699.90,849.90,'BRL','https://picsum.photos/seed/nb550x/600/600.jpg','Design retrô-basketball com couro premium. Um dos tênis mais desejados do momento.','[39,40,41,42,43]',45,0,1),
  (16,4,'Nike','Nike Dunk Low','nike-dunk-low',649.90,NULL,'BRL','https://picsum.photos/seed/dunklowx/600/600.jpg','Ícone do skate e da cultura street. Couro liso com amortecimento Foam premium.','[38,39,40,41,42,43,44]',40,0,1),

  (17,5,'Nike','Moletom Nike Club Futebol','moletom-nike-club-futebol',299.90,379.90,'BRL','https://picsum.photos/seed/nikemoletom/600/600.jpg','Moletom com capuz em fleece premium. Logo Nike bordado. Perfeito para antes e depois do jogo.','["P","M","G","GG","XG"]',25,0,1),
  (18,5,'Adidas','Camiseta Adidas Entrada 22','camiseta-adidas-entrada-22',149.90,NULL,'BRL','https://picsum.photos/seed/adicamisa/600/600.jpg','Camiseta de treino com tecnologia AEROREADY. Tecido leve e respirável para máximo conforto.','["P","M","G","GG","XG"]',60,0,1),
  (19,5,'Puma','Jaqueta Puma Evostripe','jaqueta-puma-evostripe',349.90,449.90,'BRL','https://picsum.photos/seed/pumajaqueta/600/600.jpg','Jaqueta corta-vento com design stripe. Ideal para treinos e dia a dia com estilo esportivo.','["P","M","G","GG"]',30,0,1),
  (20,5,'Under Armour','Regata Under Armour Tech','regata-under-armour-tech',129.90,NULL,'BRL','https://picsum.photos/seed/uaregata/600/600.jpg','Tecnologia anti-odor e secagem rápida. Regata essencial para treinos intensos.','["P","M","G","GG","XG"]',80,1,1)
ON DUPLICATE KEY UPDATE
  category_id=VALUES(category_id), brand=VALUES(brand), name=VALUES(name), slug=VALUES(slug),
  price=VALUES(price), old_price=VALUES(old_price), currency=VALUES(currency), image_url=VALUES(image_url),
  description=VALUES(description), sizes_json=VALUES(sizes_json), stock_qty=VALUES(stock_qty),
  is_featured=VALUES(is_featured), is_active=VALUES(is_active);

-- IMPORTANTE: os produtos acima usam IDs fixos (1-20). Como a coluna id
-- agora é AUTO_INCREMENT (ver schema.sql), o próximo produto cadastrado
-- pelo painel admin precisa começar depois do maior ID já usado no seed —
-- senão o INSERT automático colide com um ID existente.
ALTER TABLE products AUTO_INCREMENT = 21;

-- Cupons (exemplos)
INSERT INTO coupons (id, code, discount_type, discount_value, min_subtotal, max_discount_amount, expires_at, usage_limit, used_count, is_active)
VALUES
  (1,'PITCH10','percent',10,200,NULL,DATE_ADD(NOW(), INTERVAL 365 DAY),1000,0,1),
  (2,'FUTSAL5','percent',5,0,NULL,DATE_ADD(NOW(), INTERVAL 180 DAY),1000,0,1),
  (3,'FRETEGRATIS','fixed',15,0,NULL,DATE_ADD(NOW(), INTERVAL 90 DAY),500,0,0)
ON DUPLICATE KEY UPDATE
  code=VALUES(code), discount_type=VALUES(discount_type), discount_value=VALUES(discount_value),
  min_subtotal=VALUES(min_subtotal), max_discount_amount=VALUES(max_discount_amount),
  expires_at=VALUES(expires_at), usage_limit=VALUES(usage_limit),
  used_count=VALUES(used_count), is_active=VALUES(is_active);

