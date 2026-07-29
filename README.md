ETAPA 3 — Dashboard profissional
=================================

Onde colocar:
  server/src/routes/admin.js  -> server/src/routes/admin.js
  front/app/admin/page.js     -> front/app/admin/page.js

O que foi feito:
- Endpoint GET /manage/dashboard agora devolve, num único SELECT agregado:
  total de produtos, ativos, inativos, em promoção (old_price > price),
  em destaque, sem estoque, estoque baixo (<=5 unidades — limite provisório
  até a etapa 4 trazer um campo de "estoque mínimo" por produto), total de
  categorias e total de marcas distintas.
- Também devolve os 5 últimos produtos cadastrados e a contagem de produtos
  por categoria (pra alimentar os gráficos).
- Dashboard do painel: 9 cards, gráfico de barras "produtos por categoria" e
  gráfico "ativos x inativos" — feitos com CSS/divs puro, sem adicionar
  nenhuma biblioteca nova ao projeto.
- Nenhuma tabela nova, nenhuma rota quebrada, autenticação intacta.

Build do Next.js rodado com sucesso antes da entrega.
