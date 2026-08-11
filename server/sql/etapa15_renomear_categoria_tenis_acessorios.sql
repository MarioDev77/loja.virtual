-- ============================================================
-- ETAPA 15 — Renomeia a categoria 'Tênis' (id 4, slug 'tenis')
-- para 'Acessórios' (slug 'acessorios')
-- ============================================================
-- Não cria nem apaga tabelas. Só atualiza a linha existente em
-- `categories`. Os produtos que já estavam na categoria (FK
-- category_id) continuam exatamente os mesmos, só passam a
-- aparecer sob o nome/slug novo — nada é reatribuído.
-- ============================================================

USE pitch_futebol;

UPDATE categories
SET slug = 'acessorios',
    name = 'Acessórios',
    description = 'Acessórios para o dia a dia'
WHERE slug = 'tenis';

-- Confirma o resultado.
SELECT id, slug, name, description FROM categories WHERE id = 4;
