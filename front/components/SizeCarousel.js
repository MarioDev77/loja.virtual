'use client';

import { useRef } from 'react';
import Link from 'next/link';

// Numeração de calçado disponível na loja: 35 ao 45.
const SIZES = Array.from({ length: 45 - 35 + 1 }, (_, i) => 35 + i);

/**
 * Faixa de numeração (tamanhos de chuteira/tênis) com bolinhas circulares,
 * no mesmo estilo do carrossel de categorias — rolagem lateral com arraste
 * do dedo/mouse ou pelas setas. Cada número leva direto para o catálogo já
 * filtrado por aquele tamanho.
 */
export default function SizeCarousel() {
  const trackRef = useRef(null);

  function scrollByAmount(dir) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.6), behavior: 'smooth' });
  }

  return (
    <section className="size-carousel-section" aria-label="Numeração">
      <div className="section-inner size-carousel-wrap">
        <p className="size-carousel-title">Encontre pela numeração</p>

        <div className="cat-carousel-wrap">
          <button
            type="button"
            className="cat-carousel-arrow left"
            onClick={() => scrollByAmount(-1)}
            aria-label="Numerações anteriores"
          >
            <iconify-icon className="iconify" icon="mdi:chevron-left" style={{ fontSize: 20 }} />
          </button>

          <div className="size-carousel-track" ref={trackRef}>
            {SIZES.map((n) => (
              <Link key={n} href={`/produtos?size=${n}`} className="size-carousel-item">
                <span className="size-carousel-circle">{n}</span>
                <span className="size-carousel-label">Tam. {n}</span>
              </Link>
            ))}
          </div>

          <button
            type="button"
            className="cat-carousel-arrow right"
            onClick={() => scrollByAmount(1)}
            aria-label="Próximas numerações"
          >
            <iconify-icon className="iconify" icon="mdi:chevron-right" style={{ fontSize: 20 }} />
          </button>
        </div>
      </div>
    </section>
  );
}
