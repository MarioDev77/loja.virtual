'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { productImageUrl } from '@/lib/api';

/**
 * ProductGallery — galeria de imagens do produto, estilo marketplace
 * (Shopee / Mercado Livre).
 *
 * - Imagem principal + miniaturas (miniaturas na lateral no desktop, em
 *   carrossel horizontal abaixo no mobile/tablet).
 * - Setas de navegação discretas, visíveis principalmente no hover.
 * - Swipe horizontal no celular.
 * - Zoom "lupa" ao passar o mouse (desktop): a região sob o cursor é
 *   ampliada em tempo real, sem mover a imagem inteira.
 * - Clique abre um visualizador em tela cheia (lightbox), com zoom por
 *   roda do mouse / pinça (pinch), arraste quando ampliado, e navegação
 *   entre fotos sem fechar.
 * - O lightbox é renderizado via portal em document.body, então nunca
 *   fica preso dentro de um ancestral com `transform`/`overflow` (causa
 *   mais comum de modal "grudando" num canto da tela).
 */
export default function ProductGallery({ images, productName, zoomLevel = 2.5 }) {
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

  // ── Swipe (toque) na imagem principal ────────────────────────────────
  const mainRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchDraggedRef = useRef(false);
  const [touchDragPx, setTouchDragPx] = useState(0);
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  function onMainPointerDown(e) {
    if (e.pointerType !== 'touch' || !hasMultiple) return;
    touchStartRef.current = { x: e.clientX, y: e.clientY };
    touchDraggedRef.current = false;
    setIsTouchDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onMainPointerMove(e) {
    if (e.pointerType !== 'touch' || !isTouchDragging) return;
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) touchDraggedRef.current = true;
    if (Math.abs(dx) >= Math.abs(dy)) setTouchDragPx(dx);
  }

  function onMainPointerUp() {
    if (!isTouchDragging) return;
    const width = mainRef.current?.getBoundingClientRect().width || 1;
    const threshold = Math.min(90, width * 0.18);
    if (Math.abs(touchDragPx) > threshold) {
      if (touchDragPx < 0) next(); else prev();
    }
    setIsTouchDragging(false);
    setTouchDragPx(0);
  }

  function onMainClick() {
    if (touchDraggedRef.current) { touchDraggedRef.current = false; return; }
    if (activeUrl) setLightboxOpen(true);
  }

  // ── Zoom "lupa" por hover (somente mouse de verdade) ─────────────────
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  function onMainMouseEnter(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    setZoomActive(true);
  }
  function onMainMouseMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const rect = mainRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  }
  function onMainMouseLeave() {
    setZoomActive(false);
  }

  // ── Teclado no lightbox (setas + ESC) ─────────────────────────────────
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

  // Trava o scroll da página enquanto o lightbox está aberto.
  useEffect(() => {
    if (!lightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [lightboxOpen]);

  return (
    <div className="pg">
      <div className="pg-wrap">
        {/* Imagem principal */}
        <div
          ref={mainRef}
          className="pg-main"
          style={{ cursor: activeUrl ? 'zoom-in' : 'default' }}
          onPointerDown={onMainPointerDown}
          onPointerMove={(e) => { onMainPointerMove(e); onMainMouseMove(e); }}
          onPointerUp={onMainPointerUp}
          onPointerCancel={onMainPointerUp}
          onPointerEnter={onMainMouseEnter}
          onPointerLeave={onMainMouseLeave}
          onClick={onMainClick}
        >
          {activeUrl ? (
            <>
              <div className="pg-track">
                {gallery.map((img, i) => {
                  const basePercent = (i - activeIndex) * 100;
                  const dragOffsetPx = isTouchDragging ? touchDragPx : 0;
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={img.id || i}
                      src={productImageUrl(img.url)}
                      alt={productName || 'Produto'}
                      draggable={false}
                      className="pg-slide"
                      style={{
                        transform: `translate3d(calc(${basePercent}% + ${dragOffsetPx}px), 0, 0)`,
                        transition: isTouchDragging ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    />
                  );
                })}
              </div>

              {zoomActive && (
                <div
                  className="pg-lens"
                  style={{
                    backgroundImage: `url(${activeUrl})`,
                    backgroundSize: `${zoomLevel * 100}% ${zoomLevel * 100}%`,
                    backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                  }}
                />
              )}
            </>
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
        <Lightbox
          gallery={gallery}
          activeIndex={activeIndex}
          productName={productName}
          hasMultiple={hasMultiple}
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

// ─────────────────────────────────────────────────────────────────────────
// Lightbox: visualizador em tela cheia com zoom (roda/pinça) e arraste.
// ─────────────────────────────────────────────────────────────────────────
function Lightbox({ gallery, activeIndex, productName, hasMultiple, onClose, onNext, onPrev, onSelect }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null); // { dist0, scale0, mid0, translate0 }
  const panRef = useRef(null);   // { lastX, lastY }
  const swipeRef = useRef(null); // { startX, startY, dragged }

  const activeUrl = productImageUrl(gallery[activeIndex]?.url);

  // Reseta zoom/posição ao trocar de foto (ajuste de estado durante a
  // renderização, conforme o padrão recomendado pelo React em vez de usar
  // um efeito — evita um render extra em cascata).
  const [prevActiveIndex, setPrevActiveIndex] = useState(activeIndex);
  if (activeIndex !== prevActiveIndex) {
    setPrevActiveIndex(activeIndex);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setDragPx(0);
  }

  function clampTranslate(nextScale, t) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return t;
    const minX = rect.width * (1 - nextScale);
    const minY = rect.height * (1 - nextScale);
    return {
      x: Math.min(0, Math.max(minX, t.x)),
      y: Math.min(0, Math.max(minY, t.y)),
    };
  }

  function zoomAt(clientX, clientY, nextScaleRaw) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextScale = Math.min(4, Math.max(1, nextScaleRaw));
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    setTranslate((t) => {
      const ratio = nextScale / scale;
      const nt = { x: px - (px - t.x) * ratio, y: py - (py - t.y) * ratio };
      return clampTranslate(nextScale, nt);
    });
    setScale(nextScale);
  }

  // ── Zoom com roda do mouse (listener nativo, não-passivo) ─────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      zoomAt(e.clientX, e.clientY, scale + dir * 0.4);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  function onDoubleClick(e) {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      zoomAt(e.clientX, e.clientY, 2.5);
    }
  }

  // ── Pointer events: arraste (pan), swipe e pinça (2 dedos) ─────────────
  function onPointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const dist0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRef.current = {
        dist0: dist0 || 1,
        scale0: scale,
        mid0: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        translate0: translate,
      };
      setIsPinching(true);
      panRef.current = null;
      swipeRef.current = null;
    } else if (pointersRef.current.size === 1) {
      if (scale > 1) {
        panRef.current = { lastX: e.clientX, lastY: e.clientY };
        swipeRef.current = null;
      } else {
        swipeRef.current = { startX: e.clientX, startY: e.clientY, dragged: false };
        panRef.current = null;
      }
      setIsDragging(true);
    }
  }

  function onPointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const dist1 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const { dist0, scale0, mid0, translate0 } = pinchRef.current;
      const nextScale = Math.min(4, Math.max(1, scale0 * (dist1 / dist0)));
      const ratio = nextScale / scale0;
      const nt = { x: mid0.x - (mid0.x - translate0.x) * ratio, y: mid0.y - (mid0.y - translate0.y) * ratio };
      setScale(nextScale);
      setTranslate(clampTranslate(nextScale, nt));
      return;
    }

    if (panRef.current) {
      const dx = e.clientX - panRef.current.lastX;
      const dy = e.clientY - panRef.current.lastY;
      panRef.current = { lastX: e.clientX, lastY: e.clientY };
      setTranslate((t) => clampTranslate(scale, { x: t.x + dx, y: t.y + dy }));
      return;
    }

    if (swipeRef.current && hasMultiple) {
      const dx = e.clientX - swipeRef.current.startX;
      const dy = e.clientY - swipeRef.current.startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) swipeRef.current.dragged = true;
      if (Math.abs(dx) >= Math.abs(dy)) setDragPx(dx);
    }
  }

  function endPointer(e) {
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
      setIsPinching(false);
    }

    if (pointersRef.current.size === 0) {
      if (swipeRef.current) {
        const width = wrapRef.current?.getBoundingClientRect().width || 1;
        const threshold = Math.min(90, width * 0.18);
        if (hasMultiple && Math.abs(dragPx) > threshold) {
          if (dragPx < 0) onNext(); else onPrev();
        }
        swipeRef.current = null;
        setDragPx(0);
      }
      panRef.current = null;
      setIsDragging(false);
      if (scale < 1.02) { setScale(1); setTranslate({ x: 0, y: 0 }); }
    } else if (pointersRef.current.size === 1) {
      // Saiu de pinça pra um dedo só: recomeça o "baseline" do pan pra não pular.
      const [remaining] = [...pointersRef.current.values()];
      panRef.current = scale > 1 ? { lastX: remaining.x, lastY: remaining.y } : null;
      pinchRef.current = null;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualização ampliada da imagem"
      className="pg-lightbox"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button type="button" aria-label="Fechar" className="pg-close" onClick={onClose}>
        <iconify-icon className="iconify" icon="mdi:close" style={{ fontSize: 20 }} />
      </button>

      {hasMultiple && (
        <button
          type="button"
          aria-label="Imagem anterior"
          className="pg-arrow pg-arrow-left pg-lb-arrow"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <iconify-icon className="iconify" icon="mdi:chevron-left" style={{ fontSize: 26 }} />
        </button>
      )}

      <div
        ref={wrapRef}
        className="pg-lb-viewport"
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : (hasMultiple ? 'grab' : 'default') }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={onDoubleClick}
      >
        <div className="pg-track">
          {gallery.map((img, i) => {
            const isActive = i === activeIndex;
            const basePercent = (i - activeIndex) * 100;
            const dragOffsetPx = scale <= 1 ? dragPx : 0;
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={img.id || i}
                src={productImageUrl(img.url)}
                alt={productName || 'Produto'}
                draggable={false}
                className="pg-lb-slide"
                style={{
                  transform: isActive
                    ? `translate3d(calc(${basePercent}% + ${dragOffsetPx}px), 0, 0) translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`
                    : `translate3d(calc(${basePercent}% + ${dragOffsetPx}px), 0, 0)`,
                  transformOrigin: '0 0',
                  transition: (isDragging || isPinching) ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            );
          })}
        </div>
      </div>

      {hasMultiple && (
        <button
          type="button"
          aria-label="Próxima imagem"
          className="pg-arrow pg-arrow-right pg-lb-arrow"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <iconify-icon className="iconify" icon="mdi:chevron-right" style={{ fontSize: 26 }} />
        </button>
      )}

      {hasMultiple && (
        <div className="pg-dots pg-lb-dots">
          {gallery.map((img, i) => (
            <span
              key={img.id || i}
              className={`pg-dot${i === activeIndex ? ' active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onSelect(i); }}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
