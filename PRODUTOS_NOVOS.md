# Produtos novos adicionados (todas as fotos enviadas)

Este zip é o **projeto inteiro** (front + server) já com todas as fotos que você
mandou processadas e organizadas, mais as 3 migrations novas prontas pra rodar.
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

47 fotos no total, já convertidas pra `.webp`, redimensionadas e sem metadados
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
        apply-etapa7.js apply-etapa8.js apply-etapa9.js apply-all-new-products.js
git commit -m "feat: adiciona 9 produtos novos (blusas + chuteiras society)"
git push
```

O Railway faz o deploy automático (se estiver configurado assim). As fotos só
ficam acessíveis em `/seed-images/...` depois desse deploy, porque o backend
serve essa pasta a partir do próprio repositório.

### 3) Rodar as migrations no banco (uma vez só)

Você pode rodar as 3 juntas com um único comando:

```bash
cd server
node apply-all-new-products.js
```

Saída esperada:
```
Conectado!
✅ Aplicado: ./sql/etapa7_add_produtos_blusas_reais.sql
✅ Aplicado: ./sql/etapa8_add_meias_camisas_termicas.sql
✅ Aplicado: ./sql/etapa9_add_chuteiras_society.sql
Pronto! Todos os produtos novos foram inseridos.
```

Ou, se preferir rodar uma de cada vez (mesmo resultado):
```bash
node apply-etapa7.js
node apply-etapa8.js
node apply-etapa9.js
```

⚠️ São `INSERT` puros (sem `ON DUPLICATE KEY`) — rode **uma vez só**. Se rodar
de novo, duplica os produtos. Pra desfazer algum, apague pelo slug:

```sql
DELETE FROM products WHERE slug IN (
  'short-termico-compressao','kit-dryfit-premium','regata-americana-canelada',
  'meias-antiderrapantes-jcolour','camisa-regata-termica-frases',
  'chuteira-society-nike-mamba','chuteira-society-adidas-f50',
  'chuteira-society-nike-mercurial','chuteira-society-adidas-azul-verde'
);
```
(`product_images` é apagado sozinho via `ON DELETE CASCADE`.)

### 4) Conferir

```
https://lojavirtual-production-2708.up.railway.app/api/products?category=blusas
https://lojavirtual-production-2708.up.railway.app/api/products?category=society
```

Depois é só abrir o site e navegar pelas categorias **Blusas** e **Society**.

## O que tem neste zip

```
server/
  seed-images/                                    ← 47 fotos (as originais + as 47 novas já processadas)
  sql/etapa7_add_produtos_blusas_reais.sql
  sql/etapa8_add_meias_camisas_termicas.sql
  sql/etapa9_add_chuteiras_society.sql
  apply-etapa7.js
  apply-etapa8.js
  apply-etapa9.js
  apply-all-new-products.js                       ← roda as 3 migrations de uma vez
  (+ todo o resto do backend, sem node_modules)
front/
  (todo o front-end, sem node_modules — não precisou de nenhuma mudança)
```

**Obs:** `node_modules` e `.git` não vão neste zip. Se precisar reinstalar as
dependências: `npm install` dentro de `server/` e de `front/`.
