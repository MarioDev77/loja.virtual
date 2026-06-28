'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { brl } from '@/lib/format';

const STATUS_LABELS = {
  pending:    'Pendente',
  processing: 'Processando',
  shipped:    'Enviado',
  delivered:  'Entregue',
  cancelled:  'Cancelado',
};

export default function ContaPage() {
  const { token, user, login, logout, isAuthenticated } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [logging,  setLogging]  = useState(false);

  const [orders,  setOrders]  = useState([]);
  const [ordersStatus, setOrdersStatus] = useState('loading');

  useEffect(() => {
    if (!isAuthenticated) return;
    setOrdersStatus('loading');
    apiRequest('/orders/my', { token })
      .then((data) => {
        setOrders(data.orders || []);
        setOrdersStatus('ready');
      })
      .catch(() => setOrdersStatus('error'));
  }, [isAuthenticated, token]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginErr('');
    if (!username || !password) { setLoginErr('Preencha usuário e senha.'); return; }
    setLogging(true);
    try {
      await login(username, password);
    } catch (err) {
      setLoginErr(err.message || 'Falha ao autenticar.');
    } finally {
      setLogging(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div style={{ paddingTop: 100, display: 'flex', justifyContent: 'center', padding: '100px 24px 60px' }}>
        <div className="modal-content" style={{ width: '100%', maxWidth: 440 }}>
          <div className="checkout-body">
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted)', marginBottom: 24 }}>
              Entrar na minha conta
            </p>
            <div className="checkout-form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <input
                type="text"
                placeholder="E-mail ou usuário"
                className="field-input"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Senha"
                className="field-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {loginErr && <div className="error-box">{loginErr}</div>}
              <button onClick={handleLogin} className="btn-primary" style={{ justifyContent: 'center' }} disabled={logging}>
                {logging ? 'Entrando…' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Minha conta</h1>
          {user && <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>{user.email || user.username}</p>}
        </div>
        <button onClick={logout} className="btn-secondary">Sair</button>
      </div>

      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Meus pedidos</h2>

        {ordersStatus === 'loading' && (
          <p style={{ color: 'var(--muted)' }}>Carregando pedidos…</p>
        )}
        {ordersStatus === 'error' && (
          <p style={{ color: 'var(--muted)' }}>Não foi possível carregar seus pedidos.</p>
        )}
        {ordersStatus === 'ready' && !orders.length && (
          <div id="emptyState" role="status">
            <span className="iconify" data-icon="mdi:package-variant-closed-remove" style={{ fontSize: 36, color: 'var(--muted)', marginBottom: 12 }} />
            <h3>Nenhum pedido ainda</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>Quando você fizer um pedido, ele aparecerá aqui.</p>
          </div>
        )}
        {ordersStatus === 'ready' && orders.map((order) => (
          <div key={order.id} style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Pedido #{order.id}</span>
                <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--muted)' }}>
                  {order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 13, padding: '4px 10px', borderRadius: 8, background: 'var(--amber)', color: '#fff', fontWeight: 600 }}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--amber-dk)' }}>
                  {brl(order.total_amount)}
                </span>
              </div>
            </div>
            {order.items && order.items.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
                {order.items.map((it, i) => (
                  <span key={i}>
                    {it.qty}x {it.name} (Tam. {it.size || '—'}){i < order.items.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
