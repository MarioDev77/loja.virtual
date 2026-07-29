'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductGrid from '@/components/ProductGrid';
import { useProducts } from '@/lib/useProducts';
import { apiRequest } from '@/lib/api';

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

  // ── Filtros avançados: marca, faixa de preço, tamanho ──────────────────────
  const [brand, setBrand]       = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [size, setSize]         = useState('');
  const [meta, setMeta]         = useState({ brands: [], sizes: [], priceMin: 0, priceMax: 0 });

  useEffect(() => {
    apiRequest('/products/meta')
      .then((data) => setMeta({
        brands: data.brands || [],
        sizes: data.sizes || [],
        priceMin: data.priceMin || 0,
        priceMax: data.priceMax || 0,
      }))
      .catch(() => {}); // filtros de marca/tamanho só não aparecem; catálogo continua funcionando
  }, []);

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
    brand,
    minPrice,
    maxPrice,
    size,
  });

  const categoryTitle = CATEGORIES.find((c) => c.slug === category)?.label || 'Todos os Produtos';
  const hasActiveFilters = category !== 'all' || !!brand || !!minPrice || !!maxPrice || !!size;

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(inputVal.trim());
  }

  function clearFilters() {
    setCategory('all');
    setBrand('');
    setMinPrice('');
    setMaxPrice('');
    setSize('');
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
            <iconify-icon className="search-icon iconify" icon="mdi:magnify" aria-hidden="true" />
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

        {/* Filtros avançados: marca, faixa de preço, tamanho */}
        <div
          className="catalog-controls"
          style={{ flexWrap: 'wrap', gap: 12, marginTop: 4 }}
          role="group"
          aria-label="Filtros avançados"
        >
          <select
            className="sort-select"
            aria-label="Filtrar por marca"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option value="">Todas as marcas</option>
            {meta.brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          <select
            className="sort-select"
            aria-label="Filtrar por tamanho"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            <option value="">Todos os tamanhos</option>
            {meta.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <input
            type="number"
            inputMode="decimal"
            placeholder="Preço mín."
            aria-label="Preço mínimo"
            className="field-input"
            style={{ width: 120 }}
            min="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="Preço máx."
            aria-label="Preço máximo"
            className="field-input"
            style={{ width: 120 }}
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />

          {hasActiveFilters && (
            <button type="button" className="btn-secondary" style={{ fontSize: 13 }} onClick={clearFilters}>
              <iconify-icon className="iconify" icon="mdi:filter-remove-outline" style={{ fontSize: 16 }} />
              Limpar filtros
            </button>
          )}
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
