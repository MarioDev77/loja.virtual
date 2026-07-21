'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProductGrid from '@/components/ProductGrid';
import { useProducts } from '@/lib/useProducts';

const WPP_NUMBER = '5511999999999';

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { products, status, errorMessage, hasMore, isLoadingMore, loadMore, retry } = useProducts({
    category: 'all',
    sort: 'newest',
  });

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (search.trim()) router.push(`/produtos?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <>
      {/* ====== HERO ====== */}
      <section id="heroSection" aria-label="Destaque principal">
        <div className="hero-bg">
          <Image
            src="/assets/img/hero.webp"
            alt="Estoque de chuteiras Pitch Futebol"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover', opacity: 0.45, transform: 'scale(1.04)' }}
          />
        </div>
        <div className="hero-overlay" />

        <div className="hero-content">
          <p className="hero-eyebrow anim-fade-up-1">Loja especializada em futebol</p>
          <h1 className="hero-title anim-fade-up-2">
            Seu jogo<br /><em>merece</em><br />o melhor
          </h1>
          <p className="hero-subtitle anim-fade-up-3">
            Chuteiras Society, Futsal e Campo. Tênis e blusas para quem respira futebol.
          </p>
          <div className="hero-actions anim-fade-up-4">
            <a href="#productsSection" className="btn-primary">
              <span className="iconify" data-icon="mdi:shoe-cleat" style={{ fontSize: 16 }} />
              Ver catálogo
            </a>
            <a
              href={`https://wa.me/${WPP_NUMBER}?text=${encodeURIComponent('Olá! Quero saber mais sobre as chuteiras.')}`}
              target="_blank"
              rel="noopener"
              className="btn-ghost"
            >
              <span className="iconify" data-icon="mdi:whatsapp" style={{ fontSize: 16 }} />
              Falar no WhatsApp
            </a>
          </div>
        </div>

        <div className="hero-scroll" aria-hidden="true">
          <span className="hero-scroll-label">Scroll</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ====== TRUST BAR ====== */}
      <div id="trustBar" aria-label="Diferenciais">
        <div className="trust-inner">
          <div className="trust-item">
            <span className="iconify" data-icon="mdi:shield-check-outline" />
            Compra segura e garantida
          </div>
          <div className="trust-item">
            <span className="iconify" data-icon="mdi:truck-fast-outline" />
            Entrega para todo o Brasil
          </div>
          <div className="trust-item">
            <span className="iconify" data-icon="mdi:storefront-outline" />
            Loja física e online
          </div>
          <div className="trust-item">
            <span className="iconify" data-icon="mdi:headset" />
            Atendimento especializado
          </div>
        </div>
      </div>

      {/* ====== PRODUCTS ====== */}
      <section id="productsSection" aria-label="Catálogo de produtos">
        <div className="section-inner">
          <div className="section-header reveal">
            <div>
              <p className="section-eyebrow">Catálogo</p>
              <h2 className="section-title">Todos os Produtos</h2>
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
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
    </>
  );
}
