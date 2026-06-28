'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductGrid from '@/components/ProductGrid';
import { useProducts } from '@/lib/useProducts';

const CATEGORIES = [
  { slug: 'all',     label: 'Todos' },
  { slug: 'society', label: 'Society' },
  { slug: 'futsal',  label: 'Futsal' },
  { slug: 'campo',   label: 'Campo' },
  { slug: 'tenis',   label: 'Tênis' },
  { slug: 'blusas',  label: 'Blusas' },
];

const SORTS = [
  { value: 'newest',     label: 'Mais recentes' },
  { value: 'price_asc',  label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'name_asc',   label: 'A–Z' },
];

function ProdutosContent() {
  const searchParams = useSearchParams();

  const [category, setCategory] = useState(searchParams.get('cat') || 'all');
  const [sort, setSort]         = useState('newest');
  const [search, setSearch]     = useState(searchParams.get('q') || '');
  const [inputVal, setInputVal] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const cat = searchParams.get('cat') || 'all';
    const q   = searchParams.get('q')   || '';
    setCategory(cat);
    setSearch(q);
    setInputVal(q);
  }, [searchParams]);

  const { products, status, errorMessage, hasMore, isLoadingMore, loadMore, retry } = useProducts({
    category,
    sort,
    search,
  });

  const categoryTitle = CATEGORIES.find((c) => c.slug === category)?.label || 'Todos os Produtos';

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(inputVal.trim());
  }

  return (
    <section id="productsSection" aria-label="Catálogo de produtos" style={{ paddingTop: 100 }}>
      <div className="section-inner">
        <div className="section-header reveal">
          <div>
            <p className="section-eyebrow">Catálogo</p>
            <h2 id="categoryTitle" className="section-title">{categoryTitle}</h2>
          </div>
          <div className="cat-filters" role="group" aria-label="Filtrar por categoria">
            {CATEGORIES.map((c) => (
              <button
                key={c.slug}
                className={`cat-tab${category === c.slug ? ' active' : ''}`}
                onClick={() => { setCategory(c.slug); setSearch(''); setInputVal(''); }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="catalog-controls">
          <form className="search-bar" role="search" onSubmit={handleSearchSubmit}>
            <span className="search-icon iconify" data-icon="mdi:magnify" aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar produto…"
              aria-label="Buscar produto"
              autoComplete="off"
              spellCheck="false"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
          </form>
          <select
            className="sort-select"
            aria-label="Ordenar por"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <ProductGrid
          status={status}
          products={products}
          errorMessage={errorMessage}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
          onRetry={retry}
        />
      </div>
    </section>
  );
}

export default function ProdutosPage() {
  return (
    <Suspense fallback={
      <div style={{ paddingTop: 120, textAlign: 'center', color: 'var(--muted)' }}>
        Carregando…
      </div>
    }>
      <ProdutosContent />
    </Suspense>
  );
}
