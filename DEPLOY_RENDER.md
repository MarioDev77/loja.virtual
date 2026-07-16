# Deploy do backend no Render (grátis) — mantendo o MySQL no Railway

O plano: sua API (`server/`) vai pro **Render** (free tier), e o banco MySQL
**continua no Railway** exatamente como está — só o Express/Node muda de casa.
Nada no código de conexão com banco muda, porque ele já lê tudo do `.env`
(veja `scripts/db-connection.js` e `src/db/pool.js`).

## ⚠️ Antes de começar: a limitação do plano free do Render

O disco do plano free é **efêmero** — toda vez que o serviço reinicia ou você
faz um novo deploy, os arquivos gravados em runtime (a pasta `server/uploads/`,
onde vão as fotos que você sobe pelo painel admin) **somem**. Isso não afeta:

- `server/seed-images/` — fica ok, porque é versionado no git e volta a
  existir em todo deploy junto com o resto do código.
- Produtos que você já cadastrou com fotos em `seed-images/` (praticamente
  tudo que a gente fez até agora).

Isso afeta:
- Fotos que você subir **pelo painel admin dali pra frente** — se o serviço
  reiniciar (dorme por inatividade no free e acorda depois), essas fotos
  podem desaparecer.

**Solução de curto prazo**: continue usando o fluxo que já usamos (eu processo
as fotos e gero uma migration `etapaN`, você roda um script) — isso grava tudo
em `seed-images/`, que é versionado e nunca some.
**Solução de longo prazo, se quiser upload direto pelo admin**: migrar o
upload pra um serviço de storage externo (Cloudinary tem free tier generoso,
ou Cloudflare R2). Posso montar isso depois se topar.

## Passo 1 — Criar conta no Render e conectar o repositório

1. Acesse [render.com](https://render.com) e crie uma conta (dá pra logar
   direto com GitHub).
2. Clique em **New +** → **Blueprint**.
3. Conecte o repositório do GitHub onde está o `projetinho`.
4. O Render vai detectar o arquivo `render.yaml` que já deixei na raiz do
   projeto e vai sugerir criar o serviço `pitch-futebol-api` automaticamente,
   com:
   - Root directory: `server`
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check: `/health`
   - Plano: Free

## Passo 2 — Preencher as variáveis de ambiente

O `render.yaml` já criou os "slots" das variáveis, mas os valores reais (por
segurança) você preenche manualmente no dashboard: **seu serviço → Environment
→ Add Environment Variable**. Copie estes valores (já são os mesmos do seu
`server/.env` local, com os segredos placeholder já trocados por valores
reais de verdade):

```
CORS_ORIGIN=https://loja-virtual-mauve.vercel.app
JWT_SECRET=225e6ef3c9dbfc25f35bc4bbf64542a7df56b92e82fba26fe48f89c2e93c561f7a2dcf60a03dcb446e8094395c775176
JWT_ISSUER=pitch-futebol
JWT_AUDIENCE=pitch-futebol-api
ADMIN_ROUTE_PREFIX=/manage
OWNERSHIP_TOKEN_SECRET=b71eb724672590601e8d1b9a8b6ce17a63017f42f0ab123e1093b80dcb7ee9c4
CPF_PEPPER=a9aa00c93bd1e5c18d8afe4aadf9877400ab84e335b421c4
ADMIN_USER=admin
ADMIN_PASS_HASH=<< veja o Passo 2.1 abaixo >>
MYSQL_URL=mysql://root:dIcBzKUgMygTCzBuhxEabmsYeyOIijSf@turntable.proxy.rlwy.net:25473/railway
```

### Sobre previews da Vercel

Além da URL de produção (`loja-virtual-mauve.vercel.app`), o backend agora
também aceita automaticamente qualquer preview deployment da Vercel cujo
domínio comece com `loja-virtual-` (é o padrão que a Vercel usa pra gerar as
URLs de preview do seu projeto, tipo `loja-virtual-git-nomedabranch-
seuuser.vercel.app`). Não precisa adicionar cada preview manualmente no
`CORS_ORIGIN` — só a URL de produção mesmo, como já está acima. Se algum dia
trocar o nome do projeto na Vercel, ajusta a variável `VERCEL_PREVIEW_PREFIX`
no Render pra bater com o novo prefixo.

### Passo 2.1 — Gerar o `ADMIN_PASS_HASH`

Esse é o hash bcrypt da sua senha de admin — eu não devo saber sua senha em
texto puro, então roda isso **na sua máquina** (dentro de `server/`, com
`node_modules` instalado):

```bash
node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA_AQUI', 12))"
```

Copia o hash que sair (começa com `$2a$` ou `$2b$`) e cola no
`ADMIN_PASS_HASH` do Render (e no seu `.env` local também, se quiser testar
localmente).

## Passo 3 — Deploy

Clique em **Apply** / **Create Web Service**. O Render vai buildar e subir.
Acompanha o log — quando aparecer algo como:

```
[boot] Pitch Futebol API on port 10000 (production)
```

tá no ar. Testa o health check:

```
https://pitch-futebol-api.onrender.com/health
```

(troque `pitch-futebol-api` pelo nome real que o Render deu ao serviço, se
for diferente — aparece no topo do dashboard).

## Passo 4 — Apontar o front pro novo backend

No serviço do **front** (Vercel ou onde estiver hospedado), adicione/edite a
variável de ambiente:

```
NEXT_PUBLIC_API_BASE=https://pitch-futebol-api.onrender.com/api
```

e faça um redeploy do front. Isso já é o suficiente — o `front/lib/api.js`
lê essa variável automaticamente, não precisa mexer em mais nada.

Também já deixei o `front/next.config.mjs` com o hostname do Render liberado
pra carregar imagens (`pitch-futebol-api.onrender.com`) — se o Render te der
um nome de serviço diferente desse, me avisa ou edita essa linha você mesmo.

## Passo 5 — Conferir

```
https://pitch-futebol-api.onrender.com/health
https://pitch-futebol-api.onrender.com/api/products?category=blusas
```

Depois abre o site (front) e confere se os produtos carregam normalmente.

## Sobre o "sono" do plano free

O serviço dorme depois de ~15 minutos sem receber requisição, e o primeiro
acesso depois disso demora uns 30-50 segundos pra acordar. Pra um projeto em
fase de testes/portfólio tá ótimo; se a loja começar a vender de verdade e
isso incomodar os clientes, o upgrade pro plano pago do Render ($7/mês) tira
esse problema.

## Railway: o que fazer com ele agora

Você **não precisa cancelar o Railway** — o MySQL continua rodando lá exatamente
igual. Se quiser, pode desligar só o serviço antigo do **backend** no Railway
(o Express que estava rodando lá) pra não pagar por algo duplicado, mantendo
apenas o serviço de **MySQL** ativo.
