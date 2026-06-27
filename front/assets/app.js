'use strict';

/* ==========================================================================
   PITCH — app.js
   -----------------------------------------------------------------------
   NOTAS DE SEGURANÇA (não remover ao editar):
   1) Preço/total NUNCA são enviados ao backend como fonte da verdade.
      O checkout manda apenas { productId, size, qty } por item — o
      servidor recalcula tudo a partir do preço atual no banco
      (ver server/src/services/orders.service.js). Isso é o que impede
      "price tampering" via IDOR.
   2) Toda inserção de texto vindo da API ou do usuário no DOM usa
      textContent (nunca innerHTML com string interpolada), prevenindo XSS
      mesmo que o conteúdo do banco seja comprometido.
   3) O token JWT fica em memória (variável de módulo), nunca em
      localStorage/sessionStorage — reduz a superfície de roubo de token
      via XSS. Só um "hint" de sessão (nome/role) é persistido para UI.
   ========================================================================== */

// ---------------------------------------------------------------------------
// Configuração — ajuste API_BASE se a API estiver em outro host/porta.
// ---------------------------------------------------------------------------
const API_BASE = 'https://lojavirtual-production-2708.up.railway.app/api';

// ---------------------------------------------------------------------------
// Configuração de contato — EDITE AQUI com os dados reais da loja
// ---------------------------------------------------------------------------
const WPP_NUMBER = '5511999999999'; // ex: '5511987654321' (código do país + DDD + número, sem +)
const WPP_BASE   = `https://wa.me/${WPP_NUMBER}`;
const IG_URL     = 'https://instagram.com/pitch.futebol'; // handle real do Instagram

// ---------------------------------------------------------------------------
// Estado em memória
// ---------------------------------------------------------------------------
let currentCategory = 'all';
let currentSort     = 'newest';
let currentSearch   = '';
let currentPage     = 1;
let isLoadingMore   = false;
let hasMoreProducts = false;

let currentModalProduct = null;
let modalQty  = 1;
let modalSize = null;
let authToken = null; // nunca persistido em storage

const CART_KEY = 'pitch_cart_v1';
const WISH_KEY = 'pitch_wish_v1';
const PAGE_LIMIT = 12;

// ---------------------------------------------------------------------------
// Helpers genéricos
// ---------------------------------------------------------------------------
function brl(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // sempre textContent — nunca innerHTML com dado dinâmico
  return node;
}

function showToast(message, type = 'info') {
  const host = document.getElementById('toastContainer');
  if (!host) return;
  const icon = type === 'success' ? 'mdi:check-circle' : type === 'error' ? 'mdi:alert-circle' : 'mdi:information';
  const toast = el('div', `toast ${type}`);
  const iconSpan = document.createElement('span');
  iconSpan.className = 'iconify text-lg flex-shrink-0';
  iconSpan.setAttribute('data-icon', icon);
  toast.appendChild(iconSpan);
  toast.appendChild(el('span', '', message));
  host.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.25s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

// ---------------------------------------------------------------------------
// Máscaras de input
// ---------------------------------------------------------------------------
function maskCpf(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  let out = digits;
  if (digits.length > 9) out = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (digits.length > 6) out = digits.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (digits.length > 3) out = digits.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  return out;
}

function maskPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 10) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digits.length > 6)  return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  if (digits.length > 2)  return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  if (digits.length > 0)  return `(${digits}`;
  return digits;
}

function maskCep(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return digits.replace(/(\d{5})(\d{1,3})/, '$1-$2');
  return digits;
}

function maskState(value) {
  return value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
}

function applyMask(inputEl, maskFn) {
  inputEl.addEventListener('input', () => {
    const before = inputEl.value;
    const after  = maskFn(before);
    if (after !== before) inputEl.value = after;
  });
}

function setupInputMasks() {
  const cpfEl   = document.getElementById('chkCpf');
  const phoneEl = document.getElementById('chkPhone');
  const cepEl   = document.getElementById('chkCep');
  const stateEl = document.getElementById('chkState');
  if (cpfEl)   applyMask(cpfEl,   maskCpf);
  if (phoneEl) applyMask(phoneEl, maskPhone);
  if (cepEl)   applyMask(cepEl,   maskCep);
  if (stateEl) applyMask(stateEl, maskState);
}

// ---------------------------------------------------------------------------
// Cliente de API
// ---------------------------------------------------------------------------
async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  if (auth && authToken) headers['Authorization'] = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  } catch {
    const err = new Error('Não foi possível conectar à loja agora. Verifique sua internet.');
    err.code = 'NETWORK';
    throw err;
  }

  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }

  if (!res.ok) {
    const err = new Error((data && data.error) || 'Algo deu errado. Tente novamente.');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Carrinho (localStorage)
// ---------------------------------------------------------------------------
function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeCart(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {}
  renderCartBadge();
}

function cartCount()    { return readCart().reduce((s, i) => s + i.qty, 0); }
function cartSubtotal() { return readCart().reduce((s, i) => s + i.unitPrice * i.qty, 0); }

function addToCart(product, size, qty) {
  const items = readCart();
  const key   = `${product.id}:${size || ''}`;
  const existing = items.find((it) => `${it.productId}:${it.size || ''}` === key);
  if (existing) {
    existing.qty = Math.min(10, existing.qty + qty);
  } else {
    items.push({ productId: product.id, size: size || null, qty: Math.min(10, qty),
      name: product.name, brand: product.brand, image: product.image, unitPrice: product.price });
  }
  writeCart(items);
}

function updateCartQty(productId, size, qty) {
  const items = readCart();
  const it = items.find((i) => i.productId === productId && (i.size || null) === (size || null));
  if (!it) return;
  it.qty = Math.max(1, Math.min(10, qty));
  writeCart(items);
  renderCartPanel();
}

function removeFromCart(productId, size) {
  const items = readCart().filter((i) => !(i.productId === productId && (i.size || null) === (size || null)));
  writeCart(items);
  renderCartPanel();
}

// ---------------------------------------------------------------------------
// Wishlist (localStorage)
// ---------------------------------------------------------------------------
function readWish() {
  try {
    const raw = localStorage.getItem(WISH_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeWish(ids) {
  try { localStorage.setItem(WISH_KEY, JSON.stringify(ids)); } catch {}
  renderWishBadge();
}

function isWished(productId) { return readWish().includes(productId); }

function toggleWish(productId, productName, productSnapshot) {
  const wish = readWish();
  const idx  = wish.indexOf(productId);
  if (idx > -1) {
    wish.splice(idx, 1);
    removeWishSnapshot(productId);
    showToast(`${productName} removido dos favoritos`, 'info');
  } else {
    wish.push(productId);
    if (productSnapshot) saveWishSnapshot(productSnapshot);
    showToast(`${productName} salvo nos favoritos ♡`, 'success');
  }
  writeWish(wish);
  // Atualiza botão no modal se estiver aberto para este produto
  const btn = document.getElementById('modalWishBtn');
  if (btn && currentModalProduct && currentModalProduct.id === productId) {
    btn.textContent = isWished(productId) ? '♥ Salvo' : '♡ Favoritar';
    btn.classList.toggle('wished', isWished(productId));
  }
  // Atualiza ícones nos cards do grid
  document.querySelectorAll(`.wish-btn[data-id="${productId}"]`).forEach((b) => {
    b.textContent   = isWished(productId) ? '♥' : '♡';
    b.title         = isWished(productId) ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    b.classList.toggle('wished', isWished(productId));
  });
}

function renderWishBadge() {
  const count = readWish().length;
  const badge = document.getElementById('wishCount');
  if (!badge) return;
  if (count > 0) { badge.textContent = String(count); badge.classList.add('show'); }
  else { badge.classList.remove('show'); }
}

// ---------------------------------------------------------------------------
// Navegação entre seções
// ---------------------------------------------------------------------------
function showSection(name) {
  const hero     = document.getElementById('heroSection');
  const products = document.getElementById('productsSection');
  const gallery  = document.getElementById('gallerySection');
  if (name === 'gallery') {
    hero.classList.add('hidden');
    products.classList.add('hidden');
    gallery.classList.remove('hidden');
  } else {
    hero.classList.remove('hidden');
    products.classList.remove('hidden');
    gallery.classList.add('hidden');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showGallery() { renderGallery(); showSection('gallery'); }

// ---------------------------------------------------------------------------
// Skeleton loading
// ---------------------------------------------------------------------------
function renderSkeletons(count = 8) {
  const gridEl = document.getElementById('productsGrid');
  gridEl.innerHTML = '';
  gridEl.classList.remove('hidden');
  for (let i = 0; i < count; i++) {
    const card = el('div', 'product-card skeleton');
    const imgW = el('div', 'product-img-wrap skeleton-img');
    const body = el('div', 'body');
    body.appendChild(el('span', 'skeleton-line short'));
    body.appendChild(el('span', 'skeleton-line'));
    body.appendChild(el('span', 'skeleton-line price'));
    card.appendChild(imgW);
    card.appendChild(body);
    gridEl.appendChild(card);
  }
}

// ---------------------------------------------------------------------------
// Catálogo de produtos
// ---------------------------------------------------------------------------
async function loadProducts(append = false) {
  const loadingEl = document.getElementById('productsLoading');
  const gridEl    = document.getElementById('productsGrid');
  const emptyEl   = document.getElementById('emptyState');
  const errorEl   = document.getElementById('errorState');
  const moreBtn   = document.getElementById('loadMoreBtn');

  if (!append) {
    currentPage = 1;
    // Mostra skeletons enquanto carrega
    loadingEl.classList.add('hidden');
    emptyEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    if (moreBtn) moreBtn.classList.add('hidden');
    renderSkeletons();
  } else {
    isLoadingMore = true;
    if (moreBtn) { moreBtn.disabled = true; moreBtn.textContent = 'Carregando...'; }
  }

  try {
    const params = { page: currentPage, limit: PAGE_LIMIT };
    if (currentCategory !== 'all') params.category = currentCategory;
    if (currentSort)   params.sort = currentSort;
    if (currentSearch) params.q    = currentSearch;

    const data = await apiRequest(`/products${buildQuery(params)}`);
    const products  = (data && data.products) || [];
    hasMoreProducts = !!(data && data.hasMore);

    // Filtra produtos com imagem interna (bloqueia picsum e externos não confiáveis)
    const validProducts = products.filter((p) =>
      p.image && (p.image.startsWith('/') ||
        p.image.startsWith('https://lojavirtual-production-2708.up.railway.app'))
    );

    if (!append) {
      gridEl.innerHTML = '';
      if (!validProducts.length) {
        gridEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        return;
      }
      emptyEl.classList.add('hidden');
      gridEl.classList.remove('hidden');
    }

    validProducts.forEach((p) => gridEl.appendChild(renderProductCard(p)));

    // Botão "Carregar mais"
    if (moreBtn) {
      if (hasMoreProducts) {
        moreBtn.classList.remove('hidden');
        moreBtn.disabled    = false;
        moreBtn.textContent = 'Carregar mais';
      } else {
        moreBtn.classList.add('hidden');
      }
    }
  } catch (err) {
    if (!append) {
      gridEl.innerHTML = '';
      gridEl.classList.add('hidden');
      emptyEl.classList.add('hidden');
      errorEl.classList.remove('hidden');
      document.getElementById('errorStateMsg').textContent =
        err.code === 'NETWORK'
          ? 'Não foi possível conectar à loja. Verifique sua internet.'
          : 'Não foi possível carregar os produtos. Tente novamente.';
    } else {
      showToast('Não foi possível carregar mais produtos.', 'error');
    }
  } finally {
    isLoadingMore = false;
    if (append && moreBtn) {
      moreBtn.disabled    = false;
      moreBtn.textContent = 'Carregar mais';
    }
  }
}

function loadMore() {
  if (isLoadingMore || !hasMoreProducts) return;
  currentPage++;
  loadProducts(true);
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ---------------------------------------------------------------------------
// Card de produto
// ---------------------------------------------------------------------------
function renderProductCard(p) {
  const card = el('div', 'product-card');
  card.addEventListener('click', (e) => {
    if (e.target.classList.contains('wish-btn')) return; // não abre modal ao clicar no favorito
    openProductModal(p);
  });

  const imgWrap = el('div', 'product-img-wrap');

  // Badge de desconto
  if (p.oldPrice && p.oldPrice > p.price) {
    const pct = Math.round((1 - p.price / p.oldPrice) * 100);
    imgWrap.appendChild(el('span', 'product-badge off', `-${pct}%`));
  }

  // Botão de favorito
  const wishBtn = el('button', `wish-btn${isWished(p.id) ? ' wished' : ''}`, isWished(p.id) ? '♥' : '♡');
  wishBtn.type            = 'button';
  wishBtn.dataset.id      = p.id;
  wishBtn.title           = isWished(p.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  wishBtn.setAttribute('aria-label', `Favoritar ${p.name}`);
  wishBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleWish(p.id, p.name, p); });
  imgWrap.appendChild(wishBtn);

  const img   = document.createElement('img');
  img.src     = p.image || '';
  img.alt     = p.name  || 'Produto';
  img.loading = 'lazy';
  imgWrap.appendChild(img);
  card.appendChild(imgWrap);

  const body = el('div', 'body');
  body.appendChild(el('span', 'brand', p.brand || ''));
  body.appendChild(el('h3', 'name', p.name || ''));

  const priceRow = el('div', 'price-row');
  if (p.oldPrice && p.oldPrice > p.price) {
    priceRow.appendChild(el('span', 'price-old', brl(p.oldPrice)));
  }
  priceRow.appendChild(el('span', 'price-now', brl(p.price)));
  body.appendChild(priceRow);
  card.appendChild(body);
  return card;
}

// ---------------------------------------------------------------------------
// Filtros, busca e ordenação
// ---------------------------------------------------------------------------
function filterCategory(cat) {
  currentCategory = cat;
  currentSearch   = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.cat-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });

  const titleEl = document.getElementById('categoryTitle');
  const labels  = { all: 'Todos os Produtos', society: 'Chuteiras Society',
    futsal: 'Chuteiras Futsal', campo: 'Chuteiras Campo', tenis: 'Tênis', blusas: 'Blusas' };
  if (titleEl) titleEl.textContent = labels[cat] || 'Todos os Produtos';

  showSection('home');
  document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
  loadProducts();
}

function setSortAndReload(sort) {
  currentSort = sort;
  loadProducts();
}

let searchTimer;
function onSearchInput(value) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearch = value.trim();
    currentCategory = 'all';
    document.querySelectorAll('.cat-tab').forEach((b) => b.classList.remove('active'));
    const allBtn = document.querySelector('.cat-tab[data-cat="all"]');
    if (allBtn) allBtn.classList.add('active');
    const titleEl = document.getElementById('categoryTitle');
    if (titleEl) titleEl.textContent = currentSearch ? `Resultados para "${currentSearch}"` : 'Todos os Produtos';
    loadProducts();
  }, 350);
}

// ---------------------------------------------------------------------------
// Modal de produto + avaliações
// ---------------------------------------------------------------------------
function openProductModal(product) {
  currentModalProduct = product;
  modalQty  = 1;
  modalSize = (product.sizes && product.sizes[0]) || null;

  document.getElementById('modalImage').src = product.image || '';
  document.getElementById('modalImage').alt = product.name  || '';
  document.getElementById('modalBrand').textContent = product.brand || '';
  document.getElementById('modalName').textContent  = product.name  || '';
  document.getElementById('modalPrice').textContent = brl(product.price);

  const oldPriceEl = document.getElementById('modalOldPrice');
  if (product.oldPrice && product.oldPrice > product.price) {
    oldPriceEl.textContent = brl(product.oldPrice);
    oldPriceEl.classList.remove('hidden');
  } else {
    oldPriceEl.textContent = '';
    oldPriceEl.classList.add('hidden');
  }

  document.getElementById('modalDesc').textContent = product.desc || '';
  document.getElementById('modalQty').textContent  = String(modalQty);

  // Botão wishlist no modal
  const wishBtn = document.getElementById('modalWishBtn');
  if (wishBtn) {
    wishBtn.textContent = isWished(product.id) ? '♥ Salvo' : '♡ Favoritar';
    wishBtn.classList.toggle('wished', isWished(product.id));
    wishBtn.onclick = () => toggleWish(product.id, product.name, product);
  }

  const sizesEl = document.getElementById('modalSizes');
  sizesEl.innerHTML = '';
  (product.sizes || []).forEach((size) => {
    const btn   = el('button', 'size-btn', String(size));
    btn.type     = 'button';
    btn.dataset.size = String(size);
    if (String(size) === String(modalSize)) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      modalSize = size;
      sizesEl.querySelectorAll('button').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    sizesEl.appendChild(btn);
  });

  const wppLink = document.getElementById('modalWppLink');
  wppLink.href  = `${WPP_BASE}?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${product.name}`)}`;
  document.getElementById('modalIgLink').href = IG_URL;

  document.getElementById('productModal').classList.add('open');

  // Carrega avaliações do produto
  loadProductReviews(product.id);
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  currentModalProduct = null;
}

function changeModalQty(delta) {
  modalQty = Math.max(1, Math.min(10, modalQty + delta));
  document.getElementById('modalQty').textContent = String(modalQty);
}

function addModalToCart() {
  if (!currentModalProduct) return;
  addToCart(currentModalProduct, modalSize, modalQty);
  showToast('Produto adicionado ao carrinho', 'success');
  closeProductModal();
  renderCartPanel();
}

// ---------------------------------------------------------------------------
// Avaliações no modal
// ---------------------------------------------------------------------------
async function loadProductReviews(productId) {
  const reviewsEl = document.getElementById('modalReviews');
  if (!reviewsEl) return;

  reviewsEl.innerHTML = '';
  const loading = el('p', 'reviews-loading', 'Carregando avaliações...');
  reviewsEl.appendChild(loading);

  try {
    const data = await apiRequest(`/products/${productId}/reviews?limit=5`);
    reviewsEl.innerHTML = '';

    if (!data || !data.total) {
      reviewsEl.appendChild(el('p', 'reviews-empty', 'Nenhuma avaliação ainda. Seja o primeiro!'));
      return;
    }

    // Cabeçalho com média
    const header = el('div', 'reviews-header');
    const stars  = renderStars(data.avg);
    header.appendChild(stars);
    header.appendChild(el('span', 'reviews-avg', `${data.avg} / 5`));
    header.appendChild(el('span', 'reviews-count', `(${data.total} avaliação${data.total !== 1 ? 'ões' : ''})`));
    reviewsEl.appendChild(header);

    // Lista de avaliações
    data.reviews.forEach((r) => {
      const item = el('div', 'review-item');
      const top  = el('div', 'review-top');
      top.appendChild(el('span', 'review-name', r.name || 'Cliente'));
      top.appendChild(el('span', 'review-date', r.date || ''));
      item.appendChild(top);
      item.appendChild(renderStars(r.rating));
      if (r.comment) item.appendChild(el('p', 'review-comment', r.comment));
      reviewsEl.appendChild(item);
    });
  } catch {
    reviewsEl.innerHTML = '';
    reviewsEl.appendChild(el('p', 'reviews-empty', 'Não foi possível carregar as avaliações.'));
  }
}

function renderStars(rating) {
  const wrap = el('div', 'stars');
  for (let i = 1; i <= 5; i++) {
    const s = el('span', i <= Math.round(rating) ? 'star filled' : 'star');
    s.textContent = '★';
    wrap.appendChild(s);
  }
  return wrap;
}

// ---------------------------------------------------------------------------
// Painel de favoritos (wishlist)
// ---------------------------------------------------------------------------
function showWishPanel() {
  renderWishPanel();
  document.getElementById('wishOverlay').classList.add('open');
}

function hideWishPanel() {
  document.getElementById('wishOverlay').classList.remove('open');
}

function renderWishPanel() {
  const wish    = readWish();
  const listEl  = document.getElementById('wishItems');
  const countEl = document.getElementById('wishItemsCount');

  countEl.textContent = `${wish.length} ${wish.length === 1 ? 'item' : 'itens'}`;
  listEl.innerHTML = '';

  if (!wish.length) {
    const empty = el('div', 'wish-empty');
    empty.appendChild(el('p', '', 'Nenhum favorito salvo ainda.'));
    empty.appendChild(el('p', 'wish-empty-hint', 'Clique em ♡ num produto para salvá-lo aqui.'));
    listEl.appendChild(empty);
    return;
  }

  // Busca os dados de cada produto favoritado do localStorage do carrinho
  // (ou dos dados em memória se já renderizados) — simplesmente exibe o que
  // foi salvo pelo toggleWish a partir do product card.
  // Para exibir corretamente, guardamos um snapshot do produto ao favoritar.
  const snapshots = readWishSnapshots();

  wish.forEach((id) => {
    const p   = snapshots[id];
    const row = el('div', 'cart-line-item');

    const img = document.createElement('img');
    img.src     = (p && p.image) || '';
    img.alt     = (p && p.name)  || 'Produto';
    img.loading = 'lazy';
    row.appendChild(img);

    const info = el('div', 'cart-line-info');
    info.appendChild(el('div', 'name', (p && p.name)  || `Produto #${id}`));
    info.appendChild(el('div', 'meta', (p && p.brand) || ''));
    if (p && p.price) info.appendChild(el('div', 'cart-line-price', brl(p.price)));

    const addBtn  = el('button', 'btn-wish-add', 'Adicionar ao carrinho');
    addBtn.type   = 'button';
    addBtn.onclick = () => { if (p) { addToCart(p, null, 1); showToast(`${p.name} adicionado ao carrinho`, 'success'); } };

    const rmBtn  = el('button', 'cart-remove-btn', 'Remover');
    rmBtn.type   = 'button';
    rmBtn.onclick = () => { toggleWish(id, (p && p.name) || ''); renderWishPanel(); };

    info.appendChild(addBtn);
    info.appendChild(rmBtn);
    row.appendChild(info);
    listEl.appendChild(row);
  });
}

// Snapshots dos produtos favoritados (nome/imagem/preço para exibir no painel)
const WISH_SNAP_KEY = 'pitch_wish_snap_v1';

function readWishSnapshots() {
  try { return JSON.parse(localStorage.getItem(WISH_SNAP_KEY) || '{}'); } catch { return {}; }
}

function saveWishSnapshot(product) {
  try {
    const snaps = readWishSnapshots();
    snaps[product.id] = { name: product.name, brand: product.brand, image: product.image, price: product.price };
    localStorage.setItem(WISH_SNAP_KEY, JSON.stringify(snaps));
  } catch {}
}

function removeWishSnapshot(productId) {
  try {
    const snaps = readWishSnapshots();
    delete snaps[productId];
    localStorage.setItem(WISH_SNAP_KEY, JSON.stringify(snaps));
  } catch {}
}

// ---------------------------------------------------------------------------
// Carrinho lateral
// ---------------------------------------------------------------------------
function toggleCart() {
  const overlay = document.getElementById('cartOverlay');
  if (overlay.classList.contains('open')) overlay.classList.remove('open');
  else { renderCartPanel(); overlay.classList.add('open'); }
}

function renderCartBadge() {
  const count = cartCount();
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  if (count > 0) { badge.textContent = String(count > 99 ? '99+' : count); badge.classList.add('show'); }
  else { badge.textContent = ''; badge.classList.remove('show'); }
}

function renderCartPanel() {
  const items    = readCart();
  const listEl   = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');
  const countEl  = document.getElementById('cartItemsCount');

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  countEl.textContent = `${totalQty} ${totalQty === 1 ? 'item' : 'itens'}`;
  listEl.innerHTML    = '';

  if (!items.length) {
    listEl.appendChild(el('p', '', 'Seu carrinho está vazio.'));
    footerEl.classList.add('hidden');
    renderCartBadge();
    return;
  }

  items.forEach((it) => {
    const row = el('div', 'cart-line-item');
    const img = document.createElement('img');
    img.src   = it.image || '';
    img.alt   = it.name  || '';
    row.appendChild(img);

    const info = el('div', 'cart-line-info');
    info.appendChild(el('div', 'name', it.name || ''));
    info.appendChild(el('div', 'meta', `Tam. ${it.size || '—'} · ${it.brand || ''}`));

    const stepper  = el('div', 'qty-stepper');
    const minusBtn = el('button', '', '−');
    minusBtn.type  = 'button';
    minusBtn.addEventListener('click', () => updateCartQty(it.productId, it.size, it.qty - 1));
    const qtySpan = el('span', '', String(it.qty));
    const plusBtn = el('button', '', '+');
    plusBtn.type  = 'button';
    plusBtn.addEventListener('click', () => updateCartQty(it.productId, it.size, it.qty + 1));
    stepper.appendChild(minusBtn);
    stepper.appendChild(qtySpan);
    stepper.appendChild(plusBtn);
    info.appendChild(stepper);
    row.appendChild(info);

    const priceCol  = el('div', 'cart-line-price-col');
    priceCol.appendChild(el('div', 'cart-line-price', brl(it.unitPrice * it.qty)));
    const removeBtn = el('button', 'cart-remove-btn', 'Remover');
    removeBtn.type  = 'button';
    removeBtn.addEventListener('click', () => removeFromCart(it.productId, it.size));
    priceCol.appendChild(removeBtn);
    row.appendChild(priceCol);

    listEl.appendChild(row);
  });

  document.getElementById('cartTotal').textContent = brl(cartSubtotal());
  footerEl.classList.remove('hidden');

  const wppText = encodeURIComponent('Olá! Gostaria de finalizar minha compra na Pitch Futebol.');
  document.getElementById('wppCartLink').href = `${WPP_BASE}?text=${wppText}`;
  document.getElementById('igCartLink').href  = IG_URL;

  renderCartBadge();
}

// ---------------------------------------------------------------------------
// Checkout (multi-step)
// ---------------------------------------------------------------------------
function openSiteCheckout() {
  if (!readCart().length) { showToast('Seu carrinho está vazio', 'error'); return; }
  toggleCart();
  goToStep(1);
  renderCheckoutSummary();
  document.getElementById('checkoutSuccess').classList.add('hidden');
  document.getElementById('checkoutError').classList.add('hidden');
  document.getElementById('checkoutStep1').classList.remove('hidden');
  document.getElementById('checkoutModal').classList.add('open');
}

function closeCheckout() { document.getElementById('checkoutModal').classList.remove('open'); }

async function goToStep(step) {
  if (step === 2) {
    if (!validateStep1(true)) return;
    const ok = await ensureCustomerSession();
    if (!ok) return;
  }
  if (step === 3) {
    if (!validateStep2(true)) return;
  }

  [1, 2, 3].forEach((n) => {
    document.getElementById(`checkoutStep${n}`).classList.toggle('hidden', n !== step);
    const circle = document.getElementById(`step${n}Circle`);
    circle.classList.remove('current', 'done', 'pending');
    if (n < step) circle.classList.add('done');
    else if (n === step) circle.classList.add('current');
    else circle.classList.add('pending');
  });

  if (step === 3) renderCheckoutSummary();
}

function validateStep1(showError) {
  const name     = document.getElementById('chkName').value.trim();
  const email    = document.getElementById('chkEmail').value.trim();
  const phone    = document.getElementById('chkPhone').value.trim();
  const password = document.getElementById('chkPassword').value.trim();
  if (!name || !email || !phone || !password) {
    if (showError) showToast('Preencha nome, e-mail, telefone e senha para continuar', 'error');
    return false;
  }
  if (password.length < 8) {
    if (showError) showToast('A senha precisa ter no mínimo 8 caracteres', 'error');
    return false;
  }
  return true;
}

function validateStep2(showError) {
  const fields  = ['chkCep', 'chkStreet', 'chkNum', 'chkBairro', 'chkCity', 'chkState'];
  const missing = fields.some((id) => !document.getElementById(id).value.trim());
  if (missing) {
    if (showError) showToast('Preencha todos os campos de endereço', 'error');
    return false;
  }
  return true;
}

async function ensureCustomerSession() {
  const authErrorEl = document.getElementById('checkoutAuthError');
  authErrorEl.classList.add('hidden');
  if (authToken) return true;

  const name     = document.getElementById('chkName').value.trim();
  const email    = document.getElementById('chkEmail').value.trim();
  const phone    = document.getElementById('chkPhone').value.trim();
  const cpf      = document.getElementById('chkCpf').value.trim();
  const password = document.getElementById('chkPassword').value.trim();

  const nextBtn      = document.getElementById('step1NextBtn');
  nextBtn.disabled   = true;
  nextBtn.textContent = 'Verificando...';

  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password }),
    });
    if (loginRes.ok) { const d = await loginRes.json(); authToken = d.token; return true; }

    const safeUsername  = email.replace(/[^\w@.\-]/g, '');
    const registerRes   = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username: safeUsername, email, password, phone, cpf: cpf || undefined }),
    });
    const registerData  = await registerRes.json();
    if (registerRes.ok) { authToken = registerData.token; return true; }

    if (registerRes.status === 409) {
      authErrorEl.textContent = 'Este e-mail já tem cadastro e a senha informada não confere.';
    } else {
      authErrorEl.textContent = registerData.error || 'Não foi possível validar seus dados.';
    }
    authErrorEl.classList.remove('hidden');
    return false;
  } catch {
    authErrorEl.textContent = 'Não foi possível conectar à loja agora. Verifique sua internet.';
    authErrorEl.classList.remove('hidden');
    return false;
  } finally {
    nextBtn.disabled    = false;
    nextBtn.textContent = 'Próximo';
  }
}

function renderCheckoutSummary() {
  const items  = readCart();
  const listEl = document.getElementById('checkoutSummaryItems');
  listEl.innerHTML = '';
  items.forEach((it) => {
    const row = el('div', 'flex items-center justify-between text-sm');
    row.appendChild(el('span', 'text-stone-600', `${it.qty}x ${it.name} (Tam. ${it.size || '—'})`));
    row.appendChild(el('span', 'font-medium', brl(it.unitPrice * it.qty)));
    listEl.appendChild(row);
  });
  document.getElementById('checkoutTotal').textContent = brl(cartSubtotal());
}

async function finishOrder() {
  const items = readCart();
  if (!items.length) { showToast('Seu carrinho está vazio', 'error'); return; }

  const errorEl = document.getElementById('checkoutError');
  errorEl.classList.add('hidden');
  const btn       = document.getElementById('finishOrderBtn');
  btn.disabled    = true;
  btn.textContent = 'Enviando...';

  const payment = document.querySelector('input[name="payment"]:checked');

  // IMPORTANTE: payload NÃO contém preço/total — o servidor recalcula tudo.
  const orderPayload = {
    customer: {
      name:  document.getElementById('chkName').value.trim(),
      email: document.getElementById('chkEmail').value.trim(),
      phone: document.getElementById('chkPhone').value.trim(),
      cpf:   document.getElementById('chkCpf').value.trim(),
    },
    address: {
      cep:        document.getElementById('chkCep').value.trim(),
      street:     document.getElementById('chkStreet').value.trim(),
      number:     document.getElementById('chkNum').value.trim(),
      complement: document.getElementById('chkComp').value.trim(),
      bairro:     document.getElementById('chkBairro').value.trim(),
      city:       document.getElementById('chkCity').value.trim(),
      state:      document.getElementById('chkState').value.trim().toUpperCase().slice(0, 2),
    },
    payment: { method: payment ? payment.value : 'pix' },
    items: items.map((it) => ({ productId: it.productId, size: it.size || '—', qty: it.qty })),
  };

  try {
    await apiRequest('/orders', { method: 'POST', body: orderPayload, auth: true });
    writeCart([]);
    document.getElementById('checkoutStep3').classList.add('hidden');
    document.getElementById('checkoutSuccess').classList.remove('hidden');
    renderCartPanel();
  } catch (err) {
    if (err.status === 401) {
      // Token expirou — limpa sessão e orienta o usuário a reiniciar
      authToken = null;
      errorEl.textContent = 'Sua sessão expirou. Volte ao passo 1 e confirme seus dados novamente.';
      errorEl.classList.remove('hidden');
      setTimeout(() => goToStep(1), 2000);
    } else {
      errorEl.textContent = err.message || 'Não foi possível concluir o pedido. Tente novamente.';
      errorEl.classList.remove('hidden');
    }
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Finalizar pedido';
  }
}

// ---------------------------------------------------------------------------
// Galeria de imagens — usando apenas imagens reais presentes em seed-images/
// Para adicionar fotos da loja: inclua os arquivos em front/assets/img/ e
// adicione entradas abaixo no formato { src, alt, wide? }
// ---------------------------------------------------------------------------
const GALLERY_IMAGES = [
  { src: '/seed-images/b894ecddd6f45d77783e3fe2aafa87e7.webp', alt: 'Nike Mercurial Zoom Society — vista lateral', wide: true },
  { src: '/seed-images/39c6829d809c3f38f91d9936a00d4fda.webp', alt: 'Adidas F50 Society' },
  { src: '/seed-images/fa7e8c7a7f3b5b552e7d68be25f3c4d6.webp', alt: 'Nike Mercurial Vapor Society' },
  { src: '/seed-images/6abd8f48707108e523c26bbd0646af1f.webp', alt: 'Adidas F50 Cryfzasat Society' },
  { src: '/seed-images/569d759be3cc560ab181268c5e027b35.webp', alt: 'Nike Streetgato Futsal' },
  { src: '/seed-images/5edc5a7f325fc6d04f1803d0a2416678.webp', alt: 'Nike Tiempo Legend Futsal' },
  { src: '/seed-images/cb34f3ec459f52cd2b8f930e03f6ba7c.webp', alt: 'Joma Top Flex Futsal' },
  { src: '/seed-images/3f435f529d697d7f5fe45c3734d038f6.webp', alt: 'Nike Streetgato Pro Futsal' },
  { src: '/seed-images/8097d909fc74f9fc73882723f5f8dc23.webp', alt: 'Nike Mercurial Vapor Campo' },
  { src: '/seed-images/4147f0a2e5a710aa7aefbc7cfc8970ae.webp', alt: 'Adidas F50 Elite Campo' },
  { src: '/seed-images/ace5077c8f5d7d3403f91e2bbc7faa7d.webp', alt: 'Puma Future Ultimate Campo' },
  { src: '/seed-images/ad3322eb1e972a1196fd87cc4af347ab.webp', alt: 'Nike Mercurial Superfly Campo' },
];

function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '';
  GALLERY_IMAGES.forEach((item) => {
    const fig = el('div', `gallery-item${item.wide ? ' wide' : ''}`);
    const img = document.createElement('img');
    img.src     = item.src;
    img.alt     = item.alt;
    img.loading = 'lazy';
    fig.appendChild(img);
    fig.addEventListener('click', () => openLightbox(item.src, item.alt));
    grid.appendChild(fig);
  });
}

function openLightbox(src, alt) {
  const lightbox = document.getElementById('lightbox');
  document.getElementById('lightboxImage').src = src;
  document.getElementById('lightboxImage').alt = alt || '';
  lightbox.classList.add('open');
}

function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }

// ---------------------------------------------------------------------------
// Menu mobile
// ---------------------------------------------------------------------------
function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  filterCategory('all');
  renderCartBadge();
  renderWishBadge();
  setupInputMasks();

  // Busca
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => onSearchInput(e.target.value));
  }

  // Sort
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.addEventListener('change', (e) => setSortAndReload(e.target.value));

  // Carregar mais
  const moreBtn = document.getElementById('loadMoreBtn');
  if (moreBtn) moreBtn.addEventListener('click', loadMore);

  // Lightbox
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') closeLightbox();
  });

  // ESC fecha tudo
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeLightbox(); closeProductModal(); closeCheckout(); hideWishPanel(); }
  });

  // Clique fora fecha modais
  ['productModal', 'checkoutModal'].forEach((id) => {
    document.getElementById(id).addEventListener('click', (e) => {
      if (e.target.id === id) {
        if (id === 'productModal') closeProductModal();
        if (id === 'checkoutModal') closeCheckout();
      }
    });
  });
  document.getElementById('cartOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'cartOverlay') toggleCart();
  });
  document.getElementById('wishOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'wishOverlay') hideWishPanel();
  });
});
