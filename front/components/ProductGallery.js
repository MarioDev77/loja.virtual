'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { productImageUrl } from '@/lib/api';
import ImageLightbox, { useZoomGesture } from '@/components/ImageLightbox';

/**
 * ProductGallery — galeria de imagens do produto, estilo marketplace
 * (Shopee / Mercado Livre).
 *
 * - Imagem principal + miniaturas (miniaturas na lateral no desktop, em
 *   carrossel horizontal abaixo no mobile/tablet).
 * - Setas de navegação discretas, visíveis principalmente no hover.
 * - Swipe horizontal no celular pra trocar de foto.
 * - Zoom por roda do mouse (scroll) e por pinça (pinch) com o dedo — direto
 *   na imagem principal, sem precisar abrir nada. Passar o mouse por cima
 *   sozinho não amplia nada.
 * - Quando ampliada, dá pra arrastar (mouse ou dedo) pra navegar pela
 *   região ampliada.
 * - Clique (sem estar ampliado) abre um visualizador em tela cheia
 *   (lightbox), com o mesmo zoom por roda/pinça, e navegação entre fotos
 *   sem fechar.
 * - O lightbox é renderizado via portal em document.body, então nunca
 *   fica preso dentro de um ancestral com `transform`/`overflow` (causa
 *   mais comum de modal "grudando" num canto da tela).
 */
export default function ProductGallery({ images, productName, maxZoom = 4 }) {
  const gallery = (images && images.length > 0)
    ? images
    : [{ url: '', isPrimary: true }];

  const hasMultiple = gallery.length > 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reseta ao trocar de produto (evita índice fora do array). Ajuste de
  // estado durante a renderização, em vez de um efeito, seguindo o padrão
  // recomendado pelo React para "adjusting state when a prop changes".
  const [prevImages, setPrevImages] = useState(images);
  if (images !== prevImages) {
    setPrevImages(images);
    setActiveIndex(0);
  }

  const goTo = useCallback((index) => {
    setActiveIndex((index + gallery.length) % gallery.length);
  }, [gallery.length]);

  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const prev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  const activeUrl = productImageUrl(gallery[activeIndex]?.url);

  // ── Zoom (roda do mouse + pinça) e arraste na imagem principal ────────
  const mainRef = useRef(null);
  const mainZoom = useZoomGesture(mainRef, {
    maxZoom,
    swipeEnabled: hasMultiple,
    onSwipeEnd: (dir) => { if (dir === 1) next(); else prev(); },
  });

  // Reseta o zoom da imagem principal sempre que a foto ativa muda
  // (troca por seta, miniatura ou swipe).
  const [prevIndexForZoom, setPrevIndexForZoom] = useState(activeIndex);
  if (activeIndex !== prevIndexForZoom) {
    setPrevIndexForZoom(activeIndex);
    mainZoom.reset();
  }

  function onMainClick() {
    if (mainZoom.hasDragged()) return;
    if (mainZoom.scale > 1) return;
    if (activeUrl) setLightboxOpen(true);
  }

  const mainDragOffsetPx = mainZoom.scale <= 1 ? mainZoom.dragPx : 0;

  const lightboxItems = gallery.map((img) => ({
    src: productImageUrl(img.url),
    alt: productName || 'Produto',
  }));

  return (
    <div className="pg">
      <div className="pg-wrap">
        {/* Imagem principal */}
        <div
          ref={mainRef}
          className="pg-main"
          style={{
            cursor: mainZoom.scale > 1
              ? (mainZoom.isDragging ? 'grabbing' : 'grab')
              : (activeUrl ? 'zoom-in' : 'default'),
          }}
          onPointerDown={mainZoom.handlers.onPointerDown}
          onPointerMove={mainZoom.handlers.onPointerMove}
          onPointerUp={mainZoom.handlers.onPointerUp}
          onPointerCancel={mainZoom.handlers.onPointerCancel}
          onClick={onMainClick}
        >
          {activeUrl ? (
            <div className="pg-track">
              {gallery.map((img, i) => {
                const isActive = i === activeIndex;
                const basePercent = (i - activeIndex) * 100;
                return (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={img.id || i}
                    src={productImageUrl(img.url)}
                    alt={productName || 'Produto'}
                    draggable={false}
                    className="pg-slide"
                    style={{
                      transform: isActive
                        ? `translate3d(calc(${basePercent}% + ${mainDragOffsetPx}px), 0, 0) translate3d(${mainZoom.translate.x}px, ${mainZoom.translate.y}px, 0) scale(${mainZoom.scale})`
                        : `translate3d(calc(${basePercent}% + ${mainDragOffsetPx}px), 0, 0)`,
                      transformOrigin: '0 0',
                      transition: (mainZoom.isDragging || mainZoom.isPinching) ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="pg-empty">Sem imagem</div>
          )}

          {hasMultiple && (
            <>
              <button
                type="button"
                aria-label="Imagem anterior"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="pg-arrow pg-arrow-left"
              >
                <iconify-icon className="iconify" icon="mdi:chevron-left" style={{ fontSize: 22 }} />
              </button>
              <button
                type="button"
                aria-label="Próxima imagem"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="pg-arrow pg-arrow-right"
              >
                <iconify-icon className="iconify" icon="mdi:chevron-right" style={{ fontSize: 22 }} />
              </button>

              <div className="pg-dots">
                {gallery.map((img, i) => (
                  <span key={img.id || i} className={`pg-dot${i === activeIndex ? ' active' : ''}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Miniaturas */}
        {hasMultiple && (
          <div className="pg-thumbs">
            {gallery.map((img, i) => (
              <button
                key={img.id || i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ver imagem ${i + 1}`}
                aria-current={i === activeIndex}
                className={`pg-thumb${i === activeIndex ? ' active' : ''}`}
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
      </div>

      {mounted && lightboxOpen && createPortal(
        <ImageLightbox
          items={lightboxItems}
          activeIndex={activeIndex}
          maxZoom={maxZoom}
          onClose={() => setLightboxOpen(false)}
          onNext={next}
          onPrev={prev}
          onSelect={goTo}
        />,
        document.body,
      )}
    </div>
  );
}
