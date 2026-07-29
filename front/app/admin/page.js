'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/app/admin/layout';
import { productImageUrl } from '@/lib/api';
import { brl } from '@/lib/format';

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

  const d = dash || {};
  const byCategory = d.byCategory || [];
  const maxCategoryCount = Math.max(1, ...byCategory.map((c) => c.count));
  const active   = d.activeProducts ?? 0;
  const inactive = d.inactiveProducts ?? 0;
  const activeVsInactiveTotal = Math.max(1, active + inactive);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 14 }}>Visão geral da loja.</p>

      {/* Cards de métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
        <MetricCard label="Total de produtos" value={d.totalProducts ?? 0} />
        <MetricCard label="Ativos" value={d.activeProducts ?? 0} accent="var(--green, #22c55e)" />
        <MetricCard label="Inativos" value={d.inactiveProducts ?? 0} accent="var(--muted)" />
        <MetricCard label="Em promoção" value={d.promoProducts ?? 0} accent="var(--amber-dk, #d6a330)" />
        <MetricCard label="Em destaque" value={d.featuredProducts ?? 0} accent="var(--amber-dk, #d6a330)" />
        <MetricCard label="Sem estoque" value={d.outOfStockProducts ?? 0} accent="var(--red, #ef4444)" />
        <MetricCard label="Estoque baixo" value={d.lowStockProducts ?? 0} accent="var(--red, #ef4444)" />
        <MetricCard label="Categorias" value={d.totalCategories ?? 0} />
        <MetricCard label="Marcas" value={d.totalBrands ?? 0} />
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 32 }}>
        {/* Produtos por categoria */}
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, border: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Produtos por categoria
          </h2>
          {byCategory.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhuma categoria cadastrada ainda.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {byCategory.map((c) => (
              <div key={c.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ textTransform: 'capitalize' }}>{c.category}</span>
                  <span style={{ color: 'var(--muted)' }}>{c.count}</span>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(c.count / maxCategoryCount) * 100}%`,
                      background: 'var(--amber-dk, #d6a330)', height: '100%', borderRadius: 6,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ativos x Inativos */}
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, border: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Produtos ativos x inativos
          </h2>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 24, marginBottom: 12 }}>
            <div style={{ width: `${(active / activeVsInactiveTotal) * 100}%`, background: 'var(--green, #22c55e)' }} title={`Ativos: ${active}`} />
            <div style={{ width: `${(inactive / activeVsInactiveTotal) * 100}%`, background: 'var(--muted)' }} title={`Inativos: ${inactive}`} />
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green, #22c55e)', display: 'inline-block' }} />
              Ativos ({active})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block' }} />
              Inativos ({inactive})
            </span>
          </div>
        </div>
      </div>

      {/* Últimos produtos cadastrados */}
      <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, border: '1px solid var(--border)', marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          Últimos produtos cadastrados
        </h2>
        {(!d.recentProducts || d.recentProducts.length === 0) && (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum produto cadastrado ainda.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(d.recentProducts || []).map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              {p.image
                ? <img src={productImageUrl(p.image)} alt={p.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                : <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--border)', flexShrink: 0 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{p.category}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber-dk)', fontFamily: 'var(--font-display)' }}>{brl(p.price)}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
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

function MetricCard({ label, value, accent }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '20px 18px', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--muted)' }}>{label}</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginTop: 10, color: accent || 'var(--text)' }}>
        {value}
      </h2>
    </div>
  );
}
