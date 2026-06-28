'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/app/admin/layout';
import { brl } from '@/lib/format';

const LATEST_COUNT = 5;

const STATUS_LABELS = {
  pending:    'Pendente',
  processing: 'Processando',
  shipped:    'Enviado',
  delivered:  'Entregue',
  cancelled:  'Cancelado',
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { adminRequest, isAuthenticated } = useAdminAuth();

  const [dash,   setDash]   = useState(null);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/admin/login'); return; }

    async function load() {
      setStatus('loading');
      try {
        const [dashData, ordersData] = await Promise.all([
          adminRequest('/dashboard'),
          adminRequest('/orders?page=1&limit=20'),
        ]);
        setDash(dashData);
        setOrders(ordersData.orders || []);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }
    load();
  }, [isAuthenticated]);

  if (status === 'loading') return <p style={{ color: 'var(--muted)' }}>Carregando painel…</p>;
  if (status === 'error')   return <p style={{ color: 'var(--muted)' }}>Não foi possível carregar os dados. Tente recarregar a página.</p>;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 14 }}>Visão geral da loja.</p>

      {/* Cards de métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
        <MetricCard label="Total de pedidos" value={dash?.total_orders ?? 0} />
        <MetricCard label="Faturamento" value={brl(dash?.total_revenue ?? 0)} />
        <MetricCard label="Produtos cadastrados" value={dash?.total_products ?? 0} />
      </div>

      {/* Últimos pedidos */}
      <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Pedidos recentes</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Histórico dos últimos pedidos.</p>
          </div>
          <button
            onClick={() => router.push('/admin/pedidos')}
            className="btn-secondary"
            style={{ fontSize: 13 }}
          >
            Ver todos
          </button>
        </div>
        <OrdersTable orders={orders.slice(0, LATEST_COUNT)} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '24px 20px', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted)' }}>{label}</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginTop: 12 }}>{value}</h2>
    </div>
  );
}

export function OrdersTable({ orders }) {
  if (!orders.length) {
    return <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhum pedido encontrado.</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: 'var(--text)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            {['Código','Cliente','Total','Forma','Status','Data'].map((h) => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '14px 12px', fontWeight: 700 }}>#{order.id}</td>
              <td style={{ padding: '14px 12px' }}>{order.customer_name}</td>
              <td style={{ padding: '14px 12px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--amber-dk)' }}>{brl(order.total_amount)}</td>
              <td style={{ padding: '14px 12px', textTransform: 'capitalize' }}>{order.payment_method}</td>
              <td style={{ padding: '14px 12px' }}>
                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, background: 'var(--amber)', color: '#fff', fontWeight: 600 }}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </td>
              <td style={{ padding: '14px 12px', color: 'var(--muted)' }}>
                {order.created_at ? new Date(order.created_at).toLocaleString('pt-BR') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
