'use client';

import ProductCard from '@/components/ProductCard';
import ProductSkeletons from '@/components/ProductSkeletons';
import { useToast } from '@/context/ToastContext';

/**
 * ProductGrid — réplica dos 4 estados de #productsGrid/#emptyState/#errorState
 * em index.html + a lógica de loadProducts() em app.js. Recebe o resultado
 * de useProducts() já calculado (status, products, etc.) para poder ser
 * reutilizado tanto na home (destaques) quanto em /produtos (catálogo).
 */
export default function ProductGrid({ status, products, errorMessage, hasMore, isLoadingMore, onLoadMore, onRetry }) {
  const showToast = useToast();

  if (status === 'loading') {
    return <ProductSkeletons />;
  }

  if (status === 'error') {
    return (
      <div role="alert" id="errorState">
        <span className="iconify" data-icon="mdi:wifi-off" style={{ fontSize: 36, color: 'var(--muted)', marginBottom: 12 }} />
        <h3>Não foi possível carregar</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6, marginBottom: 20 }}>{errorMessage}</p>
        <button className="btn-primary" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div role="status" id="emptyState">
        <span className="iconify" data-icon="mdi:package-variant-closed-remove" style={{ fontSize: 36, color: 'var(--muted)', marginBottom: 12 }} />
        <h3>Nenhum produto encontrado</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>Tente outros termos de busca ou explore as categorias.</p>
      </div>
    );
  }

  return (
    <>
      <div className="products-grid" aria-label="Produtos">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onToast={showToast} />
        ))}
      </div>

      {hasMore && (
        <button id="loadMoreBtn" onClick={onLoadMore} disabled={isLoadingMore} aria-label="Carregar mais produtos">
          {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </>
  );
}
