'use client';

import { useRef } from 'react';
import Link from 'next/link';

const CATEGORY_ICONS = [
  { slug: 'all',        label: 'Todos os Produtos', icon: 'mdi:view-grid-outline' },
  { slug: 'society',    label: 'Society',           icon: 'mdi:soccer-field' },
  { slug: 'futsal',     label: 'Futsal',             icon: 'mdi:soccer' },
  { slug: 'campo',      label: 'Campo',              icon: 'mdi:stadium-variant' },
  { slug: 'acessorios', label: 'Acessórios',         icon: 'mdi:shoe-sneaker' },
  { slug: 'blusas',     label: 'Blusas',             icon: 'mdi:tshirt-crew-outline' },
  { slug: 'kits',       label: 'Kits de Treino',     icon: 'mdi:whistle-outline' },
];

/**
 * Carrossel de categorias com ícones circulares e setas de navegação,
 * no estilo pedido como referência (avatares circulares + rolagem lateral).
 * Fica centralizado quando os itens cabem na largura da tela; quando não
 * cabem (telas menores), vira uma faixa com scroll horizontal (arraste
 * com o dedo/mouse).
 */
export default function CategoryCarousel() {
  const trackRef = useRef(null);

  function scrollByAmount(dir) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.6), behavior: 'smooth' });
  }

  return (
    <section className="cat-carousel-section" aria-label="Categorias">
      <div className="section-inner cat-carousel-wrap">
        <button
          type="button"
          className="cat-carousel-arrow left"
          onClick={() => scrollByAmount(-1)}
          aria-label="Categorias anteriores"
        >
          <iconify-icon className="iconify" icon="mdi:chevron-left" style={{ fontSize: 20 }} />
        </button>

        <div className="cat-carousel-track" ref={trackRef}>
          {CATEGORY_ICONS.map((c) => (
            <Link
              key={c.slug}
              href={c.slug === 'all' ? '/produtos' : `/produtos?cat=${c.slug}`}
              className="cat-carousel-item"
            >
              <span className="cat-carousel-circle">
                <iconify-icon className="iconify" icon={c.icon} style={{ fontSize: 26 }} />
              </span>
              <span className="cat-carousel-label">{c.label}</span>
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="cat-carousel-arrow right"
          onClick={() => scrollByAmount(1)}
          aria-label="Próximas categorias"
        >
          <iconify-icon className="iconify" icon="mdi:chevron-right" style={{ fontSize: 20 }} />
        </button>
      </div>
    </section>
  );
}
