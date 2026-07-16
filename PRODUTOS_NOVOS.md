# Produtos novos adicionados (todas as fotos enviadas)

Este zip é o **projeto inteiro** (front + server) já com todas as fotos que você
mandou processadas e organizadas, mais as 5 migrations novas prontas pra rodar.
Não precisei mexer no front-end em nenhum momento — tudo já é buscado
dinamicamente da API (`GET /api/products?category=...`).

## Todos os produtos novos

| # | Produto | Categoria | Tamanho | Preço |
|---|---|---|---|---|
| 1 | Short Térmico Compressão | Blusas | P, G, 10 anos | R$ 49,99 |
| 2 | Kit Dryfit Premium (camiseta + shorts) | Blusas | M, G | R$ 79,99 |
| 3 | Regata Americana Canelada | Blusas | M, G | R$ 59,99 |
| 4 | Meias Antiderrapantes Jcolour | Blusas | Único (calçado 40-46) | R$ 25,00 |
| 5 | Camisa e Regata Térmica com Frases | Blusas | M, G | R$ 99,99 |
| 6 | Chuteira Society Nike Mamba | Society | 43 (peça única) | R$ 410,00 |
| 7 | Chuteira Society Adidas F50 | Society | 40,5 (peça única) | R$ 390,00 |
| 8 | Chuteira Society Nike Mercurial | Society | 40 (peça única) | R$ 390,00 |
| 9 | Chuteira Society Adidas Azul/Verde | Society | 37 (peça única) | R$ 299,00 |
| 10 | Chuteira de Campo Puma Ultra | Campo | 38 (peça única) | ⚠️ sob consulta |
| 11 | Chuteira de Campo Mercurial Air Zoom Branca | Campo | 39 (peça única) | R$ 450,00 |
| 12 | Chuteira de Campo Mercurial Preta | Campo | 40 (peça única) | R$ 420,00 |
| 13 | Chuteira de Campo Phantom Branca/Vermelha | Campo | 40 (peça única) | R$ 420,00 |
| 14 | Chuteira de Campo Mercurial Vapor 16 Bege/Azul | Campo | 40 (peça única) | R$ 420,00 |
| 15 | Chuteira de Campo Phantom Mamba | Campo | 40 (peça única) | R$ 450,00 |
| 16 | Chuteira de Campo Adidas Predator Branca | Campo | 41 (peça única) | R$ 420,00 |
| 17 | Chuteira de Campo Mercurial Edição Mbappé | Campo | 41 (peça única) | R$ 420,00 |
| 18 | Chuteira de Campo Mercurial Vapor 16 Laranja/Branca | Campo | 41 (peça única) | R$ 420,00 |
| 19 | Chuteira de Campo Mizuno Morelia Neo 3 | Campo | 41 (peça única) | R$ 450,00 |
| 20 | Chuteira de Campo Adidas Predator Rosa | Campo | 40 (peça única) | R$ 450,00 |
| 21 | Chuteira de Campo Adidas Predator Preta | Campo | 43 (peça única) | R$ 450,00 |
| 22 | Chuteira de Campo Adidas F50 Branca/Rosa (trava mista) | Campo | 41 (peça única) | R$ 500,00 |

⚠️ **Puma Ultra** (item 10): entrou com `is_active = 0` e `price = 0.00` porque
o preço é "sob consulta" (o banco não aceita preço nulo). Antes de ativar,
edite o preço real pelo painel admin e marque `is_active = 1`.

⚠️ **Itens 20 e 21**: você chamou de "Adidas Copa", mas as fotos mostram
"PREDATOR" escrito na própria chuteira — é esse o modelo real. Cadastrei com o
nome que aparece no produto (mais preciso pro cliente), mantendo o preço e
tamanho que você passou. Se realmente for Copa e a estampa só engana, me avisa
que eu corrijo o nome.

Todas as 13 chuteiras (society + campo) são **peças únicas** (`stock_qty = 1`)
— assim que vender, desative ou zere o estoque pelo admin.

73 fotos no total, já convertidas pra `.webp`, redimensionadas e sem metadados
(mesmo padrão que o `middlewares/upload.js` já usa pros uploads do painel admin).

## Como aplicar

### 1) Substituir a pasta do projeto

Extraia este zip por cima da sua pasta `projetinho/` local (mescla os arquivos,
não apaga nada — `node_modules` e `.git` não estão neste zip de propósito, pra
não pesar o download e não conflitar com o seu ambiente).

```bash
cd caminho/para/projetinho   # sua pasta local do projeto
unzip -o ~/Downloads/projetinho-completo.zip -d .
```

### 2) Commitar e subir pro Railway (backend)

```bash
cd server
git add seed-images sql/etapa7_add_produtos_blusas_reais.sql \
        sql/etapa8_add_meias_camisas_termicas.sql \
        sql/etapa9_add_chuteiras_society.sql \
        sql/etapa10_add_chuteiras_campo.sql \
        sql/etapa11_add_chuteiras_campo_2.sql \
        apply-etapa7.js apply-etapa8.js apply-etapa9.js apply-etapa10.js apply-etapa11.js \
        apply-all-new-products.js scripts/db-connection.js
git commit -m "feat: adiciona 22 produtos novos (blusas + chuteiras society/campo)"
git push
```

O Railway faz o deploy automático (se estiver configurado assim). As fotos só
ficam acessíveis em `/seed-images/...` depois desse deploy, porque o backend
serve essa pasta a partir do próprio repositório.

### 3) Rodar as migrations no banco (uma vez só)

Você pode rodar as 5 juntas com um único comando:

```bash
cd server
node apply-all-new-products.js
```

Saída esperada:
```
Conectado!
✅ Aplicado: sql/etapa7_add_produtos_blusas_reais.sql
✅ Aplicado: sql/etapa8_add_meias_camisas_termicas.sql
✅ Aplicado: sql/etapa9_add_chuteiras_society.sql
✅ Aplicado: sql/etapa10_add_chuteiras_campo.sql
✅ Aplicado: sql/etapa11_add_chuteiras_campo_2.sql
Pronto! Todos os produtos novos foram inseridos.
```

Ou, se preferir rodar uma de cada vez (mesmo resultado):
```bash
node apply-etapa7.js
node apply-etapa8.js
node apply-etapa9.js
node apply-etapa10.js
node apply-etapa11.js
```

⚠️ São `INSERT` puros (sem `ON DUPLICATE KEY`) — rode **uma vez só**. Se rodar
de novo, duplica os produtos. Pra desfazer algum, apague pelo slug:

```sql
DELETE FROM products WHERE slug IN (
  'short-termico-compressao','kit-dryfit-premium','regata-americana-canelada',
  'meias-antiderrapantes-jcolour','camisa-regata-termica-frases',
  'chuteira-society-nike-mamba','chuteira-society-adidas-f50',
  'chuteira-society-nike-mercurial','chuteira-society-adidas-azul-verde',
  'chuteira-campo-puma-ultra','chuteira-campo-mercurial-air-zoom-branca',
  'chuteira-campo-mercurial-preta','chuteira-campo-phantom-branca-vermelha',
  'chuteira-campo-mercurial-vapor16-bege-azul','chuteira-campo-phantom-mamba',
  'chuteira-campo-adidas-predator-branca','chuteira-campo-mercurial-mbappe',
  'chuteira-campo-mercurial-vapor16-laranja-branca',
  'chuteira-campo-mizuno-morelia-neo-3','chuteira-campo-adidas-predator-rosa',
  'chuteira-campo-adidas-predator-preta','chuteira-campo-adidas-f50-branca-rosa'
);
```
(`product_images` é apagado sozinho via `ON DELETE CASCADE`.)

### 4) Conferir

```
https://lojavirtual-production-2708.up.railway.app/api/products?category=blusas
https://lojavirtual-production-2708.up.railway.app/api/products?category=society
https://lojavirtual-production-2708.up.railway.app/api/products?category=campo
```

Depois é só abrir o site e navegar pelas categorias **Blusas**, **Society** e **Campo**.

## O que tem neste zip

```
server/
  seed-images/                                    ← 73 fotos (originais + todas as novas já processadas)
  sql/etapa7_add_produtos_blusas_reais.sql
  sql/etapa8_add_meias_camisas_termicas.sql
  sql/etapa9_add_chuteiras_society.sql
  sql/etapa10_add_chuteiras_campo.sql
  sql/etapa11_add_chuteiras_campo_2.sql
  scripts/db-connection.js                        ← conexão MySQL lida do .env, sem senha no código
  apply-etapa7.js
  apply-etapa8.js
  apply-etapa9.js
  apply-etapa10.js
  apply-etapa11.js
  apply-all-new-products.js                       ← roda as 5 migrations de uma vez
  .env                                             ← já preenchido com a conexão do Railway (git-ignorado)
  (+ todo o resto do backend, sem node_modules)
front/
  (todo o front-end, sem node_modules — não precisou de nenhuma mudança)
```

**Obs:** `node_modules` e `.git` não vão neste zip. Se precisar reinstalar as
dependências: `npm install` dentro de `server/` e de `front/`.
