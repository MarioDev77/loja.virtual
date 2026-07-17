'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/app/admin/layout';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { adminRequest, isAuthenticated } = useAdminAuth();

  const [dash,   setDash]   = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/admin/login'); return; }

    async function load() {
      setStatus('loading');
      try {
        const dashData = await adminRequest('/dashboard');
        setDash(dashData);
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
        <MetricCard label="Produtos cadastrados" value={dash?.total_products ?? 0} />
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Produtos</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Gerencie o catálogo da loja.</p>
          </div>
          <button
            onClick={() => router.push('/admin/produtos')}
            className="btn-secondary"
            style={{ fontSize: 13 }}
          >
            Ver produtos
          </button>
        </div>
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
