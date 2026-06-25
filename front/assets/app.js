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
// Estado em memória
// ---------------------------------------------------------------------------
let allProducts = [];        // cache da última listagem vinda da API
let currentCategory = 'all';
let currentModalProduct = null;
let modalQty = 1;
let modalSize = null;
let authToken = null;        // nunca persistido em storage

const CART_KEY = 'pitch_cart_v1';

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
  toast.appendChild(el('span', '', message)); // texto sempre via textContent
  host.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.25s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

// ---------------------------------------------------------------------------
// Máscaras de input — formatam em tempo real para já saírem no formato que
// o backend exige (ver regex em server/src/routes/orders.js e auth.js).
// Cada máscara só usa os caracteres permitidos pelo regex correspondente,
// então o que o usuário vê já é o que será validado no servidor.
// ---------------------------------------------------------------------------
function maskCpf(value) {
  // Backend aceita [\d.\-]+ — formato visual: 000.000.000-00
  const digits = value.replace(/\D/g, '').slice(0, 11);
  let out = digits;
  if (digits.length > 9) out = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (digits.length > 6) out = digits.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (digits.length > 3) out = digits.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  return out;
}

function maskPhone(value) {
  // Backend aceita [\d\s()\-+]+ — formato visual: (00) 00000-0000 / (00) 0000-0000
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 10) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digits.length > 6) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  if (digits.length > 2) return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  if (digits.length > 0) return `(${digits}`;
  return digits;
}

function maskCep(value) {
  // Backend aceita ^\d{5}-?\d{3}$ — formato visual: 00000-000
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return digits.replace(/(\d{5})(\d{1,3})/, '$1-$2');
  return digits;
}

function maskState(value) {
  // Backend exige ^[A-Z]{2}$ — só letras, maiúsculas, 2 caracteres
  return value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
}

/**
 * Aplica uma função de máscara a um input, preservando a posição do cursor
 * de forma simples (reposiciona no fim — adequado para máscaras que só
 * adicionam separadores, não letras no meio do texto digitado).
 */
function applyMask(inputEl, maskFn) {
  inputEl.addEventListener('input', () => {
    const before = inputEl.value;
    const after = maskFn(before);
    if (after !== before) inputEl.value = after;
  });
}

function setupInputMasks() {
  const cpfEl = document.getElementById('chkCpf');
  const phoneEl = document.getElementById('chkPhone');
  const cepEl = document.getElementById('chkCep');
  const stateEl = document.getElementById('chkState');

  if (cpfEl) applyMask(cpfEl, maskCpf);
  if (phoneEl) applyMask(phoneEl, maskPhone);
  if (cepEl) applyMask(cepEl, maskCep);
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
  if (auth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

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
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || 'Algo deu errado. Tente novamente.');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Carrinho (localStorage) — guarda só productId/size/qty + snapshot de
// exibição. O snapshot de preço é só para a UI; nunca é a fonte da verdade
// no checkout (ver finishOrder()).
// ---------------------------------------------------------------------------
function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* modo privado etc. */ }
  renderCartBadge();
}

function cartCount() {
  return readCart().reduce((sum, it) => sum + it.qty, 0);
}

function cartSubtotal() {
  return readCart().reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
}

function addToCart(product, size, qty) {
  const items = readCart();
  const key = `${product.id}:${size || ''}`;
  const existing = items.find((it) => `${it.productId}:${it.size || ''}` === key);

  if (existing) {
    existing.qty = Math.min(10, existing.qty + qty);
  } else {
    items.push({
      productId: product.id,
      size: size || null,
      qty: Math.min(10, qty),
      name: product.name,
      brand: product.brand,
      image: product.image,
      unitPrice: product.price,
    });
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
// Navegação entre seções (home / galeria)
// ---------------------------------------------------------------------------
function showSection(name) {
  const hero = document.getElementById('heroSection');
  const products = document.getElementById('productsSection');
  const gallery = document.getElementById('gallerySection');

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

function showGallery() {
  renderGallery();
  showSection('gallery');
}

// ---------------------------------------------------------------------------
// Catálogo de produtos
// ---------------------------------------------------------------------------
async function loadProducts() {
  const loadingEl = document.getElementById('productsLoading');
  const gridEl = document.getElementById('productsGrid');
  const emptyEl = document.getElementById('emptyState');
  const errorEl = document.getElementById('errorState');

  loadingEl.classList.remove('hidden');
  gridEl.classList.add('hidden');
  emptyEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  gridEl.innerHTML = '';

  try {
    const params = currentCategory === 'all' ? {} : { category: currentCategory };
    const data = await apiRequest(`/products${buildQuery(params)}`);
    allProducts = (data && data.products) || [];
    renderProducts(allProducts);
  } catch (err) {
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    document.getElementById('errorStateMsg').textContent =
      err.code === 'NETWORK'
        ? 'Não foi possível conectar à loja. Verifique sua internet e tente novamente.'
        : 'Não foi possível carregar os produtos agora. Tente novamente em instantes.';
  }
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

function renderProducts(products) {
  const loadingEl = document.getElementById('productsLoading');
  const gridEl = document.getElementById('productsGrid');
  const emptyEl = document.getElementById('emptyState');

  loadingEl.classList.add('hidden');

  if (!products.length) {
    gridEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  gridEl.classList.remove('hidden');
  gridEl.innerHTML = '';

  products.forEach((p) => gridEl.appendChild(renderProductCard(p)));
}

function renderProductCard(p) {
  const card = el('div', 'product-card');
  card.addEventListener('click', () => openProductModal(p));

  const imgWrap = el('div', 'product-img-wrap');
  if (p.oldPrice && p.oldPrice > p.price) {
    const pct = Math.round((1 - p.price / p.oldPrice) * 100);
    imgWrap.appendChild(el('span', 'product-badge off', `-${pct}%`));
  }
  const img = document.createElement('img');
  img.src = p.image || '';
  img.alt = p.name || 'Produto';
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

function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });

  const titleEl = document.getElementById('categoryTitle').querySelector('h2');
  const labels = { all: 'Todos os Produtos', society: 'Chuteiras Society', futsal: 'Chuteiras Futsal', campo: 'Chuteiras Campo', tenis: 'Tênis', blusas: 'Blusas' };
  titleEl.textContent = labels[cat] || 'Todos os Produtos';

  showSection('home');
  document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
  loadProducts();
}

// ---------------------------------------------------------------------------
// Modal de produto
// ---------------------------------------------------------------------------
function openProductModal(product) {
  currentModalProduct = product;
  modalQty = 1;
  modalSize = (product.sizes && product.sizes[0]) || null;

  document.getElementById('modalImage').src = product.image || '';
  document.getElementById('modalImage').alt = product.name || '';
  document.getElementById('modalBrand').textContent = product.brand || '';
  document.getElementById('modalName').textContent = product.name || '';
  document.getElementById('modalPrice').textContent = brl(product.price);
  document.getElementById('modalCategory').textContent = product.category || '';

  const oldPriceEl = document.getElementById('modalOldPrice');
  if (product.oldPrice && product.oldPrice > product.price) {
    oldPriceEl.textContent = brl(product.oldPrice);
    oldPriceEl.classList.remove('hidden');
  } else {
    oldPriceEl.textContent = '';
    oldPriceEl.classList.add('hidden');
  }

  document.getElementById('modalDesc').textContent = product.desc || '';
  document.getElementById('modalQty').textContent = String(modalQty);

  const sizesEl = document.getElementById('modalSizes');
  sizesEl.innerHTML = '';
  (product.sizes || []).forEach((size) => {
    const btn = el('button', 'rounded-xl border border-stone-200 py-2 text-sm font-medium hover:border-brand-700', String(size));
    btn.type = 'button';
    btn.dataset.size = String(size);
    if (String(size) === String(modalSize)) {
      btn.classList.add('border-brand-700', 'bg-brand-50', 'text-brand-700');
    }
    btn.addEventListener('click', () => {
      modalSize = size;
      sizesEl.querySelectorAll('button').forEach((b) => b.classList.remove('border-brand-700', 'bg-brand-50', 'text-brand-700'));
      btn.classList.add('border-brand-700', 'bg-brand-50', 'text-brand-700');
    });
    sizesEl.appendChild(btn);
  });

  const wppLink = document.getElementById('modalWppLink');
  wppLink.href = `https://wa.me/5511999999999?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${product.name}`)}`;
  document.getElementById('modalIgLink').href = 'https://instagram.com/';

  const modal = document.getElementById('productModal');
  modal.classList.add('open');
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
// Carrinho lateral (painel)
// ---------------------------------------------------------------------------
function toggleCart() {
  const overlay = document.getElementById('cartOverlay');
  const isOpen = overlay.classList.contains('open');
  if (isOpen) {
    overlay.classList.remove('open');
  } else {
    renderCartPanel();
    overlay.classList.add('open');
  }
}

function renderCartBadge() {
  const count = cartCount();
  const badge = document.getElementById('cartCount');
  if (count > 0) {
    badge.textContent = String(count > 99 ? '99+' : count);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderCartPanel() {
  const items = readCart();
  const listEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');
  const countEl = document.getElementById('cartItemsCount');

  countEl.textContent = `(${items.reduce((s, i) => s + i.qty, 0)} ${items.length === 1 ? 'item' : 'itens'})`;
  listEl.innerHTML = '';

  if (!items.length) {
    listEl.appendChild(el('p', 'text-stone-400 text-sm text-center py-10', 'Seu carrinho está vazio.'));
    footerEl.classList.add('hidden');
    renderCartBadge();
    return;
  }

  items.forEach((it) => {
    const row = el('div', 'cart-line-item');

    const img = document.createElement('img');
    img.src = it.image || '';
    img.alt = it.name || '';
    row.appendChild(img);

    const info = el('div', '');
    info.appendChild(el('div', 'name', it.name || ''));
    info.appendChild(el('div', 'meta', `Tam. ${it.size || '—'} · ${it.brand || ''}`));

    const stepper = el('div', 'qty-stepper');
    const minusBtn = el('button', '', '−');
    minusBtn.type = 'button';
    minusBtn.addEventListener('click', () => updateCartQty(it.productId, it.size, it.qty - 1));
    const qtySpan = el('span', '', String(it.qty));
    const plusBtn = el('button', '', '+');
    plusBtn.type = 'button';
    plusBtn.addEventListener('click', () => updateCartQty(it.productId, it.size, it.qty + 1));
    stepper.appendChild(minusBtn);
    stepper.appendChild(qtySpan);
    stepper.appendChild(plusBtn);
    info.appendChild(stepper);
    row.appendChild(info);

    const priceCol = el('div', '');
    priceCol.appendChild(el('div', 'cart-line-price', brl(it.unitPrice * it.qty)));
    const removeBtn = el('button', 'cart-remove-btn', 'Remover');
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', () => removeFromCart(it.productId, it.size));
    priceCol.appendChild(removeBtn);
    row.appendChild(priceCol);

    listEl.appendChild(row);
  });

  document.getElementById('cartTotal').textContent = brl(cartSubtotal());
  footerEl.classList.remove('hidden');

  const wppText = encodeURIComponent('Olá! Gostaria de finalizar minha compra na Pitch Futebol.');
  document.getElementById('wppCartLink').href = `https://wa.me/5511999999999?text=${wppText}`;
  document.getElementById('igCartLink').href = 'https://instagram.com/';

  renderCartBadge();
}

// ---------------------------------------------------------------------------
// Checkout (multi-step)
// ---------------------------------------------------------------------------
function openSiteCheckout() {
  if (!readCart().length) {
    showToast('Seu carrinho está vazio', 'error');
    return;
  }
  toggleCart();
  goToStep(1);
  renderCheckoutSummary();
  document.getElementById('checkoutSuccess').classList.add('hidden');
  document.getElementById('checkoutError').classList.add('hidden');
  document.getElementById('checkoutStep1').classList.remove('hidden');
  document.getElementById('checkoutModal').classList.add('open');
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
}

async function goToStep(step) {
  if (step === 2) {
    if (!validateStep1(true)) return;
    const ok = await ensureCustomerSession();
    if (!ok) return; // erro já exibido em #checkoutAuthError
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
  const name = document.getElementById('chkName').value.trim();
  const email = document.getElementById('chkEmail').value.trim();
  const phone = document.getElementById('chkPhone').value.trim();
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

// ---------------------------------------------------------------------------
// Sessão do cliente — login automático ou cadastro automático.
// O checkout do backend (POST /api/orders) exige JWT (ver
// server/src/routes/orders.js: router.post('/', authJwt, ...)). Como esta
// loja não tem tela de login separada, o e-mail/senha do Step 1 do checkout
// é usado para: 1) tentar logar; 2) se a conta não existir, cadastrar na
// hora. O token resultante fica só em memória (mesma regra do resto do
// app.js) — nunca em localStorage/sessionStorage.
// ---------------------------------------------------------------------------
async function ensureCustomerSession() {
  const authErrorEl = document.getElementById('checkoutAuthError');
  authErrorEl.classList.add('hidden');

  if (authToken) return true; // já autenticado nesta sessão de página

  const name = document.getElementById('chkName').value.trim();
  const email = document.getElementById('chkEmail').value.trim();
  const phone = document.getElementById('chkPhone').value.trim();
  const cpf = document.getElementById('chkCpf').value.trim();
  const password = document.getElementById('chkPassword').value.trim();

  const nextBtn = document.getElementById('step1NextBtn');
  nextBtn.disabled = true;
  nextBtn.textContent = 'Verificando...';

  try {
    // 1) Tenta login direto (cliente que já tem conta)
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password }),
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      authToken = data.token;
      return true;
    }

    // 2) Login falhou (provavelmente conta não existe) → tenta cadastrar.
    // O backend valida username com regex /^[\w@.\-]+$/ (sem "+"), então
    // sanitizamos aqui — o campo email continua intacto e correto.
    const safeUsername = email.replace(/[^\w@.\-]/g, '');
    const registerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username: safeUsername, email, password, phone, cpf: cpf || undefined }),
    });
    const registerData = await registerRes.json();

    if (registerRes.ok) {
      authToken = registerData.token;
      return true;
    }

    // 3) Cadastro falhou — normalmente "username/email já em uso" (409),
    // o que significa senha incorreta para uma conta existente.
    if (registerRes.status === 409) {
      authErrorEl.textContent = 'Este e-mail já tem cadastro e a senha informada não confere.';
    } else {
      authErrorEl.textContent = registerData.error || 'Não foi possível validar seus dados. Verifique e tente novamente.';
    }
    authErrorEl.classList.remove('hidden');
    return false;
  } catch {
    authErrorEl.textContent = 'Não foi possível conectar à loja agora. Verifique sua internet.';
    authErrorEl.classList.remove('hidden');
    return false;
  } finally {
    nextBtn.disabled = false;
    nextBtn.textContent = 'Próximo';
  }
}

function renderCheckoutSummary() {
  const items = readCart();
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
  if (!items.length) {
    showToast('Seu carrinho está vazio', 'error');
    return;
  }

  const errorEl = document.getElementById('checkoutError');
  errorEl.classList.add('hidden');

  const btn = document.getElementById('finishOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const payment = document.querySelector('input[name="payment"]:checked');

  // IMPORTANTE: o payload NÃO contém preço/total. O servidor recalcula tudo
  // a partir do productId — esse é o ponto central da proteção contra
  // price tampering descrita no SECURITY.md (seção "Preços IDOR").
  const orderPayload = {
    customer: {
      name: document.getElementById('chkName').value.trim(),
      email: document.getElementById('chkEmail').value.trim(),
      phone: document.getElementById('chkPhone').value.trim(),
      cpf: document.getElementById('chkCpf').value.trim(),
    },
    address: {
      cep: document.getElementById('chkCep').value.trim(),
      street: document.getElementById('chkStreet').value.trim(),
      number: document.getElementById('chkNum').value.trim(),
      complement: document.getElementById('chkComp').value.trim(),
      // backend espera "bairro" (ver OrderSchema em server/src/routes/orders.js)
      bairro: document.getElementById('chkBairro').value.trim(),
      city: document.getElementById('chkCity').value.trim(),
      // backend exige sigla de 2 letras maiúsculas (regex ^[A-Z]{2}$)
      state: document.getElementById('chkState').value.trim().toUpperCase().slice(0, 2),
    },
    // backend espera payment: { method }, não paymentMethod solto
    payment: { method: payment ? payment.value : 'pix' },
    items: items.map((it) => ({
      productId: it.productId,
      size: it.size || '—',
      qty: it.qty,
    })),
  };

  try {
    // Pedido autenticado (JWT) se houver sessão; caso a API exija login,
    // o usuário verá o erro vindo do servidor sem detalhes sensíveis.
    await apiRequest('/orders', { method: 'POST', body: orderPayload, auth: true });

    writeCart([]);
    document.getElementById('checkoutStep3').classList.add('hidden');
    document.getElementById('checkoutSuccess').classList.remove('hidden');
    renderCartPanel();
  } catch (err) {
    errorEl.textContent = err.status === 401
      ? 'Você precisa estar logado para finalizar a compra.'
      : (err.message || 'Não foi possível concluir o pedido. Tente novamente.');
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Finalizar pedido';
  }
}

// ---------------------------------------------------------------------------
// Galeria de imagens (aba "Imagens")
// ---------------------------------------------------------------------------
const GALLERY_IMAGES = [
  { src: './assets/img/hero/loja-prateleira.jpg', alt: 'Prateleiras com chuteiras coloridas expostas na loja Pitch Futebol', wide: true },
  { src: './assets/img/products/p01-adidas-branco-dourado.jpg', alt: 'Chuteira Adidas branca e dourada, vista lateral e da sola' },
  { src: './assets/img/products/p02-adidas-f50-tricolor.jpg', alt: 'Chuteira Adidas F50 branca, vermelha e azul' },
  { src: './assets/img/products/p03-adidas-f50-azul.jpg', alt: 'Chuteira Adidas F50 branca com detalhes azuis e solado translúcido' },
  { src: './assets/img/products/p04-nike-mercurial-rosa.jpg', alt: 'Chuteira Nike Mercurial branca com degradê rosa' },
  { src: './assets/img/products/p05-nike-azul-rosa.jpg', alt: 'Chuteira Nike branca com detalhes azul-piscina e rosa neon' },
  { src: './assets/img/products/p06-adidas-f50-coral.jpg', alt: 'Chuteira Adidas F50 coral com detalhes em azul royal' },
  { src: './assets/img/products/p07-adidas-roxo-verde.jpg', alt: 'Chuteira Adidas roxa com detalhes em amarelo-volt' },
  { src: './assets/img/products/p08-nike-rosa-preto.jpg', alt: 'Chuteira Nike com degradê lilás e rosa choque' },
  { src: './assets/img/products/p09-nike-azul-royal.jpg', alt: 'Chuteira Nike azul royal com detalhes brancos e rosa' },
];

function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '';
  GALLERY_IMAGES.forEach((item) => {
    const fig = el('div', `gallery-item${item.wide ? ' wide' : ''}`);
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt;
    img.loading = 'lazy';
    fig.appendChild(img);
    fig.addEventListener('click', () => openLightbox(item.src, item.alt));
    grid.appendChild(fig);
  });
}

function openLightbox(src, alt) {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImage');
  img.src = src;
  img.alt = alt || '';
  lightbox.classList.remove('pointer-events-none');
  lightbox.classList.add('opacity-100');
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.add('pointer-events-none');
  lightbox.classList.remove('opacity-100');
}

// ---------------------------------------------------------------------------
// Menu mobile
// ---------------------------------------------------------------------------
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const panel = document.getElementById('mobileMenuPanel');
  const isOpen = menu.style.opacity === '1';
  if (isOpen) {
    menu.style.opacity = '0';
    menu.classList.add('pointer-events-none');
    panel.style.transform = 'translateX(100%)';
  } else {
    menu.style.opacity = '1';
    menu.classList.remove('pointer-events-none');
    panel.style.transform = 'translateX(0)';
  }
}

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  filterCategory('all');
  renderCartBadge();
  setupInputMasks();

  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeProductModal();
      closeCheckout();
    }
  });

  // Fecha modais clicando fora do conteúdo
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
});
