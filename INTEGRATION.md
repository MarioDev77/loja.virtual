# Pitch Futebol — Front + Back unificados

Este pacote junta o **front-end** (já hardened conforme conversa anterior) com
o **back-end** (`server/`, hardened conforme `SECURITY.md`). A auditoria
abaixo lista, com transparência, o que já estava correto e o que precisou ser
corrigido para os dois lados realmente conversarem entre si.

## Bugs de HTML × JS no front (causa dos `Cannot read properties of null`)

O `app.js` tinha funções inteiras (`showSection`, `loadProducts`, `finishOrder`,
galeria/lightbox) escritas esperando elementos de HTML que nunca foram
criados no `index.html`. Isso quebrava o JavaScript com
`TypeError: Cannot read properties of null (reading 'classList')` assim que
a página carregava — antes até de qualquer chamada à API.

Foi feita uma comparação automática de **todo** `getElementById` usado no JS
contra **todo** `id` existente no HTML (front e admin). Faltavam:

| Elemento faltante | Usado por | Efeito sem ele |
|---|---|---|
| `#gallerySection` | `showSection('gallery')` | Erro ao clicar em qualquer categoria (a função roda sempre, não só na galeria) |
| `#galleryGrid` | `renderGallery()` | Aba "Galeria" nunca tinha conteúdo pra mostrar |
| `#lightbox`, `#lightboxImage` | `openLightbox`, `closeLightbox`, listener de clique fora | Erro no `DOMContentLoaded`, antes de qualquer interação |
| `#productsLoading` | `loadProducts()` | **Erro disparado assim que a loja carrega, antes do fetch dos produtos** |
| `#errorState`, `#errorStateMsg` | `loadProducts()` (catch de erro) | Mesma função do item acima — quebra sempre que chamada |
| `#checkoutError` | `goToStep`, `finishOrder` | Erro ao tentar finalizar pedido |
| `#finishOrderBtn` | `finishOrder()` | Erro ao tentar finalizar pedido |

**`#productsLoading` e `#errorState` são os mais importantes** — eles ficam
nas duas primeiras linhas de `loadProducts()`, a função que busca os
produtos na API. Sem eles, o erro acontecia *antes* da chamada à API
completar, então mesmo depois da correção do backend (`category_id`), a
tela podia continuar parecendo travada — o erro de JS interrompia a função
no meio.

**Correção aplicada:** todos os elementos foram adicionados ao `index.html`
e `admin.html` (não precisei tocar no `app.js`/`admin.js` para isso — as
funções já estavam corretas, só faltava o HTML). Também adicionei:
- Link "Galeria" na navbar (desktop e mobile), chamando `showGallery()`.
- Estilos `.gallery-item`, `.gallery-grid` e `#lightbox` no `styles.css`.
- Botão "Tentar de novo" no estado de erro, chamando `loadProducts()`.

**Aviso sobre as imagens da galeria:** o array `GALLERY_IMAGES` em `app.js`
referencia arquivos em `./assets/img/...` que não existem no projeto — essa
pasta nunca foi criada. A galeria agora carrega sem erro de JavaScript, mas
vai mostrar ícones de imagem quebrada até você adicionar arquivos reais
nesses caminhos (ou trocar os caminhos por imagens que você já tenha).

## Estrutura
```
.
├── SECURITY.md          (auditoria original do backend)
├── docker-compose.yml
├── front/
│   ├── index.html
│   ├── admin.html
│   └── assets/
│       ├── app.js       (corrigido — ver abaixo)
│       ├── admin.js     (corrigido — ver abaixo)
│       └── styles.css
└── server/
    ├── package.json
    ├── .env.example
    ├── sql/
    └── src/
```

## Auditoria do backend contra o SECURITY.md

Toda a parte de back-end foi revisada arquivo por arquivo contra cada seção
do `SECURITY.md` (SQL injection, XSS, IDOR, rotas admin ocultas, brute force,
JWT, fingerprinting, headers, CORS, content-type, validação de env). **Está
tudo implementado como documentado** — nenhuma correção foi necessária no
`server/` quanto a essas proteções.

## Bugs de schema × código (causa de "produtos não aparecem")

Estes dois problemas não eram de segurança nem de integração front↔back —
eram **incompatibilidades dentro do próprio backend**, entre `schema.sql` e
o código em `src/`. Eram a causa raiz de a loja não exibir nenhum produto.

### 1. `products.category` (coluna inexistente)

O código (`products.service.js`, `routes/admin.js`) fazia
`SELECT ... category ... FROM products`, mas o schema real não tem essa
coluna — tem `category_id` (FK para uma tabela `categories` separada, com
`slug`, `name`, `description`). Toda consulta de produtos falhava com erro
SQL `Unknown column 'category'`, capturado pelo `errorHandler.js` e devolvido
ao front como `500` genérico — por isso a loja simplesmente não mostrava
nada, sem nenhuma mensagem específica.

**Correção aplicada:** o código agora faz `JOIN` com `categories` e usa
`categories.slug` como o valor de `category` (ex.: `'society'`, `'futsal'`).
Nada mudou do lado de fora — o contrato da API (`GET /api/products`,
payloads do admin) continua exatamente igual, só a query por trás mudou.
Arquivos alterados: `products.service.js` (JOIN no SELECT) e
`routes/admin.js` (novo helper `resolveCategoryId(slug)` que resolve o slug
para o `id` antes de qualquer INSERT/UPDATE — sempre via query parametrizada,
nunca interpolação).

### 2. `products.id` sem `AUTO_INCREMENT`

A coluna `id` da tabela `products` era `INT PRIMARY KEY` simples. O seed
(`seed_products.sql`) insere IDs manuais (1 a 20), mas o código do admin
(`POST /manage/products`) faz `INSERT` sem informar `id`, esperando que o
banco gere um automaticamente. Sem `AUTO_INCREMENT`, isso falharia com
`Field 'id' doesn't have a default value` na primeira tentativa de cadastrar
produto pelo painel.

**Correção aplicada:**
- `schema.sql`: coluna alterada para `id INT AUTO_INCREMENT PRIMARY KEY`.
- `seed_products.sql`: adicionado `ALTER TABLE products AUTO_INCREMENT = 21`
  ao final do seed, para o próximo produto cadastrado pelo admin não colidir
  com os IDs 1–20 já usados.
- **Novo arquivo** `sql/migration_products_auto_increment.sql`: para quem já
  rodou o `schema.sql` antigo e tem o banco criado sem `AUTO_INCREMENT`. Roda
  um `ALTER TABLE` seguro, calculando o próximo ID livre automaticamente.
  Só é necessário se o banco já existia antes desta correção — quem está
  criando o banco do zero não precisa rodar esse arquivo.

## Problemas de integração encontrados (front ↔ back)

Estes não eram falhas de segurança no back nem no front isoladamente — eram
**descompassos entre os dois lados**, que faziam o site não funcionar de
ponta a ponta. Corrigidos:

| # | Problema | Antes (front) | Correto (conforme back) |
|---|---|---|---|
| 1 | Prefixo de admin errado | `/api/secret-admin` | `/api/manage` (= `ADMIN_ROUTE_PREFIX` no `.env`) |
| 2 | Rota de login do admin não existia | `${ADMIN_PREFIX}/login` | `POST /api/auth/login` (login único, admin e usuário) |
| 3 | Campo de login | `email` | `username` (aceita username OU email; admin usa `ADMIN_USER`) |
| 4 | `API_BASE` inconsistente entre `app.js` e `admin.js` | `admin.js` sem `/api` | Ambos agora usam `http://localhost:3000/api` |
| 5 | Campo de endereço com nome errado | `district` | `bairro` (rejeitado pelo Zod do back) |
| 6 | Forma de pagamento "achatada" | `paymentMethod: "pix"` | `payment: { method: "pix" }` (schema aninhado) |
| 7 | Estado (UF) sem normalização | texto livre | normalizado para 2 letras maiúsculas (regex `^[A-Z]{2}$` no back) |
| 8 | Dashboard do admin lendo chaves que não existem | `dashboard.totalOrders`, `latestOrders` | `total_orders`, `total_revenue`, `total_products` (sem lista de últimos pedidos — agora derivada de `GET /manage/orders`) |
| 9 | Checkout sem autenticação | nenhuma | `POST /api/orders` exige JWT — adicionado fluxo de login/cadastro automático no Step 1 do checkout (ver abaixo) |
| 10 | Campos sem máscara podiam gerar formato rejeitado pelo back | texto livre em CPF/telefone/CEP/UF | máscaras em tempo real (ver abaixo) — o que o usuário vê já é o que passa na validação do servidor |

## Máscaras de input (CPF, telefone, CEP, UF)

Os campos de **CPF**, **telefone**, **CEP** e **Estado** agora formatam o
valor enquanto o usuário digita, usando só os caracteres que os regex do
backend aceitam:

| Campo | Regex do backend | Formato exibido |
|---|---|---|
| CPF | `/^[\d.\-]+$/` | `000.000.000-00` |
| Telefone | `/^[\d\s()\-+]+$/` | `(00) 00000-0000` |
| CEP | `/^\d{5}-?\d{3}$/` | `00000-000` |
| Estado (UF) | `/^[A-Z]{2}$/` | `SP`, `BA`, etc. (maiúsculo, 2 letras) |

Implementado em `assets/app.js` (`maskCpf`, `maskPhone`, `maskCep`,
`maskState`, ligados via `applyMask`/`setupInputMasks`). Os inputs também
ganharam `inputmode="numeric"` e `maxlength` no HTML para melhorar a
digitação em teclados mobile. A normalização final no `finishOrder()`
(que já existia para o Estado) continua como segunda camada de segurança,
cobrindo casos de paste/autofill que não disparam o evento `input`.

## Novo: sessão automática no checkout

`POST /api/orders` exige um token JWT válido (`authJwt` no backend), mas o
front original não tinha nenhuma tela de login. Em vez de remover essa
exigência de segurança do backend, foi adicionado ao **Step 1 do checkout**:

1. Um campo de senha (`#chkPassword`, mínimo 8 caracteres).
2. Ao avançar para o Step 2, o front tenta logar com e-mail + senha
   (`POST /api/auth/login`). Se a conta não existir, cadastra na hora
   (`POST /api/auth/register`) usando os mesmos dados já preenchidos
   (nome, e-mail, telefone, CPF).
3. O token resultante fica **só em memória** (`authToken`, variável de
   módulo) — nunca em `localStorage`/`sessionStorage`, seguindo a mesma
   regra de segurança já aplicada ao restante do `app.js`.
4. Se o e-mail já tiver conta e a senha não conferir, o cadastro retorna
   `409` e o front mostra uma mensagem clara em vez de tentar adivinhar.

Isso significa que um cliente que volta à loja depois (mesma sessão de
página) não precisa logar de novo — mas um reload de página perde a sessão,
como esperado pela política de "token nunca persistido".

## Como rodar localmente

```bash
# Backend
cd server
cp .env.example .env   # edite JWT_SECRET, DB_*, ADMIN_PASS_HASH etc.
npm install
npm run dev             # http://localhost:3000

# Frontend (em outro terminal)
cd front
npx serve .             # ou: python3 -m http.server 5500
```

Garanta que `CORS_ORIGIN` no `.env` do servidor inclua a origem real de onde
o front é servido (ex.: `http://localhost:5500`).
