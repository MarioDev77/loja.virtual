'use client';

import { useCallback, useEffect, useState } from 'react';
import { productImageUrl } from '@/lib/api';

/**
 * ProductGallery — galeria de imagens do produto na página de detalhe da loja.
 * Mostra a imagem principal + miniaturas, permite trocar a imagem clicando
 * numa miniatura (sem recarregar a página), navegar com setas/teclado, e
 * abrir um lightbox em tela cheia. Se o produto tiver só 1 imagem, as setas
 * de navegação ficam ocultas.
 */
export default function ProductGallery({ images, productName }) {
  const gallery = (images && images.length > 0)
    ? images
    : [{ url: '', isPrimary: true }];

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const hasMultiple = gallery.length > 1;

  const goTo = useCallback((index) => {
    setActiveIndex((index + gallery.length) % gallery.length);
  }, [gallery.length]);

  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const prev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  // ── Navegação por teclado (setas + ESC para fechar o lightbox) ───────────
  useEffect(() => {
    if (!lightboxOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, next, prev]);

  const activeUrl = productImageUrl(gallery[activeIndex]?.url);

  return (
    <div>
      {/* Imagem principal */}
      <div
        className="modal-img"
        style={{
          borderRadius: 16, overflow: 'hidden', background: 'var(--surface)',
          aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', cursor: 'zoom-in',
        }}
        onClick={() => activeUrl && setLightboxOpen(true)}
      >
        {activeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeUrl}
            alt={productName || 'Produto'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Sem imagem</div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              aria-label="Imagem anterior"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              style={navBtnStyle('left')}
            >
              <iconify-icon className="iconify" icon="mdi:chevron-left" style={{ fontSize: 22 }} />
            </button>
            <button
              type="button"
              aria-label="Próxima imagem"
              onClick={(e) => { e.stopPropagation(); next(); }}
              style={navBtnStyle('right')}
            >
              <iconify-icon className="iconify" icon="mdi:chevron-right" style={{ fontSize: 22 }} />
            </button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {hasMultiple && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {gallery.map((img, i) => (
            <button
              key={img.id || i}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Ver imagem ${i + 1}`}
              aria-current={i === activeIndex}
              style={{
                width: 64, height: 64, borderRadius: 10, overflow: 'hidden', padding: 0,
                border: i === activeIndex ? '2px solid var(--amber-dk, #d6a330)' : '1px solid var(--border)',
                background: 'var(--surface)', cursor: 'pointer', flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productImageUrl(img.url)}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada da imagem"
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <iconify-icon className="iconify" icon="mdi:close" style={{ fontSize: 20 }} />
          </button>

          {hasMultiple && (
            <button
              type="button"
              aria-label="Imagem anterior"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              style={{ ...navBtnStyle('left'), left: 16 }}
            >
              <iconify-icon className="iconify" icon="mdi:chevron-left" style={{ fontSize: 26 }} />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeUrl}
            alt={productName || 'Produto'}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
          />

          {hasMultiple && (
            <button
              type="button"
              aria-label="Próxima imagem"
              onClick={(e) => { e.stopPropagation(); next(); }}
              style={{ ...navBtnStyle('right'), right: 16 }}
            >
              <iconify-icon className="iconify" icon="mdi:chevron-right" style={{ fontSize: 26 }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function navBtnStyle(side) {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: 10,
    background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
    width: 36, height: 36, color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
