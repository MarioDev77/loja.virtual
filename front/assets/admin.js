'use strict';

/* ==========================================================================
   PITCH — admin.js
   -----------------------------------------------------------------------
   NOTAS DE SEGURANÇA (não remover ao editar):
   1) O token JWT do admin fica em memória (variável de módulo), nunca em
      localStorage/sessionStorage — mesmo padrão do app.js do cliente.
      Isso reduz a superfície de roubo de token via XSS. Consequência
      aceita: ao recarregar a página (F5), é preciso logar novamente.
   2) Toda inserção de dado vindo da API no DOM usa textContent (nunca
      innerHTML com string interpolada) — previne XSS mesmo que algum
      campo no banco (nome de cliente, código de pedido, etc.) esteja
      comprometido.

   NOTAS DE INTEGRAÇÃO COM O BACKEND (server/src):
   - Prefixo de admin real é /api + ADMIN_ROUTE_PREFIX (.env), padrão
     "/manage" → "/api/manage". NUNCA "/api/admin" ou variações óbvias
     (essas retornam 404 propositalmente — ver routes/index.js).
   - Login é único para admin e usuário comum: POST /api/auth/login,
     body { username, password }. O admin fixo loga com o valor de
     ADMIN_USER (um username, não necessariamente um e-mail).
   - GET /api/manage/dashboard retorna { total_orders, total_revenue,
     total_products } — SEM lista de últimos pedidos. Por isso os
     "últimos pedidos" do painel são derivados de GET /api/manage/orders
     (mesma fonte da tabela), pegando os primeiros N.
   ========================================================================== */

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
const API_BASE = 'http://localhost:3000/api';
const ADMIN_PREFIX = '/manage'; // deve casar com ADMIN_ROUTE_PREFIX no .env do server
const LATEST_ORDERS_COUNT = 5;

// ---------------------------------------------------------------------------
// Estado em memória — token NUNCA persistido em storage
// ---------------------------------------------------------------------------
let adminToken = null;

// ---------------------------------------------------------------------------
// Helpers genéricos
// ---------------------------------------------------------------------------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // sempre textContent — nunca innerHTML com dado dinâmico
  return node;
}

function brl(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function showLoginError(message) {
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function clearLoginError() {
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

function setToken(token) {
  adminToken = token;
}

function getToken() {
  return adminToken;
}

function logoutAdmin() {
  adminToken = null;
  document.getElementById('adminArea').classList.add('hidden');
  document.getElementById('logoutBtn').classList.add('hidden');
  document.getElementById('loginCard').classList.remove('hidden');
  document.getElementById('unauthorizedNotice').classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Login — POST /api/auth/login (rota única, não existe login específico de
// admin; o backend reconhece o ADMIN_USER fixo e devolve role: 'admin').
// ---------------------------------------------------------------------------
async function loginAdmin() {
  clearLoginError();

  const username = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value.trim();

  if (!username || !password) {
    showLoginError('Preencha usuário e senha.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      showLoginError(data.error || 'Falha ao autenticar.');
      return;
    }

    if (data.user?.role !== 'admin') {
      showLoginError('Esta conta não tem acesso ao painel admin.');
      return;
    }

    setToken(data.token);
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    await loadAdminPanel();
  } catch (error) {
    showLoginError('Erro de rede. Tente novamente.');
  }
}

function getAuthHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

async function loadAdminPanel() {
  const token = getToken();
  if (!token) {
    logoutAdmin();
    return;
  }

  try {
    const dashboardRes = await fetch(`${API_BASE}${ADMIN_PREFIX}/dashboard`, {
      headers: getAuthHeaders()
    });
    const dashboardData = await dashboardRes.json();

    if (!dashboardRes.ok) {
      throw new Error(dashboardData.error || 'Falha ao carregar dashboard.');
    }

    // O dashboard não traz "últimos pedidos" — busca-se separadamente,
    // já paginado e limitado, na mesma rota que alimenta a tabela.
    const ordersRes = await fetch(`${API_BASE}${ADMIN_PREFIX}/orders?page=1&limit=20`, {
      headers: getAuthHeaders()
    });
    const ordersData = await ordersRes.json();

    if (!ordersRes.ok) {
      throw new Error(ordersData.error || 'Falha ao carregar pedidos.');
    }

    renderDashboard(dashboardData, ordersData.orders || []);
    renderOrders(ordersData.orders || []);

    document.getElementById('adminArea').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('unauthorizedNotice').classList.add('hidden');
  } catch (error) {
    console.error(error);
    logoutAdmin();
    document.getElementById('unauthorizedNotice').classList.remove('hidden');
  }
}

// ---------------------------------------------------------------------------
// Renderização — sempre via DOM API + textContent (nunca innerHTML com
// dado dinâmico vindo da API).
// ---------------------------------------------------------------------------
function renderDashboard(dashboard, orders) {
  // Campos reais devolvidos por GET /api/manage/dashboard
  // (ver server/src/routes/admin.js): total_orders, total_revenue, total_products
  document.getElementById('summaryOrders').textContent = dashboard.total_orders ?? 0;
  document.getElementById('summaryRevenue').textContent = brl(dashboard.total_revenue);

  const latestEl = document.getElementById('summaryLatest');
  clearChildren(latestEl);

  orders.slice(0, LATEST_ORDERS_COUNT).forEach(order => {
    const li = el('li');
    li.appendChild(document.createTextNode(`${order.id} — ${order.customer_name} — `));
    li.appendChild(el('span', 'font-medium', brl(order.total_amount)));
    latestEl.appendChild(li);
  });
}

function renderOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  clearChildren(tbody);

  orders.forEach(order => {
    const tr = el('tr', 'border-b border-stone-100');

    // Campos reais devolvidos por GET /api/manage/orders (ver admin.js do
    // server): id, customer_name, email, payment_method, total_amount,
    // status, created_at — NÃO existe order_code/total no payload do admin.
    tr.appendChild(el('td', 'px-4 py-4 font-semibold', `#${order.id}`));
    tr.appendChild(el('td', 'px-4 py-4', order.customer_name));
    tr.appendChild(el('td', 'px-4 py-4', brl(order.total_amount)));
    tr.appendChild(el('td', 'px-4 py-4', order.payment_method));
    tr.appendChild(el('td', 'px-4 py-4', order.status));
    tr.appendChild(el('td', 'px-4 py-4', new Date(order.created_at).toLocaleString('pt-BR')));

    tbody.appendChild(tr);
  });
}

async function fetchAdminOrders() {
  await loadAdminPanel();
}

document.addEventListener('DOMContentLoaded', () => {
  // Token vive só em memória: após reload, não há sessão persistida —
  // o admin precisa logar novamente. Isso é intencional (ver notas no topo).
});
