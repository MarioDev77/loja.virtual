ETAPA 2 — Filtros no catálogo + Galeria de até 5 fotos por produto
====================================================================

Onde colocar cada arquivo do zip (os nomes de pasta abaixo tiveram os
parênteses/colchetes removidos só por causa do empacotamento — no seu
projeto local os caminhos reais continuam os mesmos de sempre):

  server/src/routes/admin.js                  -> server/src/routes/admin.js
  server/src/routes/products.js                -> server/src/routes/products.js
  server/src/services/products.service.js       -> server/src/services/products.service.js
  server/src/middlewares/upload.js               -> server/src/middlewares/upload.js

  front/app/admin/produtos/page.js               -> front/app/admin/produtos/page.js
  front/app/loja/produtos/page.js                 -> front/app/(loja)/produtos/page.js
  front/app/loja/produto-id/page.js               -> front/app/(loja)/produto/[id]/page.js
  front/components/ProductGallery.js              -> front/components/ProductGallery.js  (arquivo NOVO)
  front/lib/useProducts.js                        -> front/lib/useProducts.js

Nenhuma tabela nova foi criada — a tabela product_images já existia no
banco (de uma etapa anterior) e agora está sendo usada de verdade.
Nenhuma rota foi removida, nenhuma alteração em autenticação.

O que foi feito:
1. Filtros de marca, faixa de preço e tamanho (combináveis com categoria e
   busca), tanto na loja (/produtos) quanto no painel admin, com botão
   "Limpar filtros" nos dois. Atualização automática, sem recarregar página.
2. Galeria de até 5 fotos por produto: upload múltiplo com preview, definir
   principal, reordenar, excluir — tudo no painel admin. Na loja, a página
   do produto mostra miniaturas, troca de imagem sem reload, setas de
   navegação (ocultas com só 1 foto) e lightbox com zoom (fecha por X, ESC
   ou clique fora).

Build do Next.js e verificação de sintaxe de todos os arquivos backend
rodados com sucesso antes da entrega.
