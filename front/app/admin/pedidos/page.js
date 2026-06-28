'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/app/admin/layout';
import { brl } from '@/lib/format';

const STATUS_OPTIONS = [
  { value: 'pending',    label: 'Pendente' },
  { value: 'processing', label: 'Processando' },
  { value: 'shipped',    label: 'Enviado' },
  { value: 'delivered',  label: 'Entregue' },
  { value: 'cancelled',  label: 'Cancelado' },
];

export default function AdminPedidosPage() {
  const router = useRouter();
  const { adminRequest, isAuthenticated } = useAdminAuth();

  const [orders,  setOrders]  = useState([]);
  const [status,  setStatus]  = useState('loading');
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [updating, setUpdating] = useState(null); // id do pedido sendo atualizado

  useEffect(() => {
    if (!isAuthenticated) { router.push('/admin/login'); return; }
    load(1);
  }, [isAuthenticated]);

  async function load(p) {
    setStatus('loading');
    try {
      const data = await adminRequest(`/orders?page=${p}&limit=20`);
      setOrders(data.orders || []);
      setHasMore(!!data.hasMore);
      setPage(p);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function updateStatus(orderId, newStatus) {
    setUpdating(orderId);
    try {
      await adminRequest(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      alert('Erro ao atualizar status: ' + (err.message || 'Tente novamente.'));
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Pedidos</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Gerencie todos os pedidos da loja.</p>
        </div>
        <button onClick={() => load(page)} className="btn-secondary" style={{ fontSize: 13 }}>
          <span className="iconify" data-icon="mdi:refresh" style={{ fontSize: 16 }} />
          Atualizar
        </button>
      </div>

      {status === 'loading' && <p style={{ color: 'var(--muted)' }}>Carregando pedidos…</p>}
      {status === 'error'   && <p style={{ color: 'var(--muted)' }}>Erro ao carregar. Tente novamente.</p>}

      {status === 'ready' && (
        <>
          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', background: 'var(--bg)' }}>
                    {['#', 'Cliente', 'E-mail', 'Total', 'Forma', 'Status', 'Data'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!orders.length && (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Nenhum pedido encontrado.</td></tr>
                  )}
                  {orders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>#{order.id}</td>
                      <td style={{ padding: '14px 16px' }}>{order.customer_name}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>{order.email}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--amber-dk)', fontFamily: 'var(--font-display)' }}>{brl(order.total_amount)}</td>
                      <td style={{ padding: '14px 16px', textTransform: 'capitalize' }}>{order.payment_method}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          disabled={updating === order.id}
                          className="sort-select"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleString('pt-BR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
            {page > 1 && (
              <button className="btn-secondary" onClick={() => load(page - 1)} style={{ fontSize: 13 }}>← Anterior</button>
            )}
            {hasMore && (
              <button className="btn-secondary" onClick={() => load(page + 1)} style={{ fontSize: 13 }}>Próxima →</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
