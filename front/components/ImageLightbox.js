'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * useZoomGesture — hook compartilhado: zoom por roda do mouse, zoom por
 * pinça (2 dedos), arraste quando ampliado, e swipe (1 dedo) pra trocar de
 * item quando não está ampliado. Usado tanto na imagem principal da galeria
 * do produto quanto nos lightboxes (produto e ofertas da home), garantindo
 * o mesmo comportamento em todos os lugares.
 */
export function useZoomGesture(ref, { maxZoom = 4, swipeEnabled = true, onSwipeEnd } = {}) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null); // { dist0, scale0, mid0, translate0 }
  const panRef = useRef(null);   // { lastX, lastY }
  const swipeRef = useRef(null); // { startX, startY }
  const draggedRef = useRef(false);

  function clamp(nextScale, t) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return t;
    const minX = rect.width * (1 - nextScale);
    const minY = rect.height * (1 - nextScale);
    return {
      x: Math.min(0, Math.max(minX, t.x)),
      y: Math.min(0, Math.max(minY, t.y)),
    };
  }

  function zoomAt(clientX, clientY, nextScaleRaw) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const nextScale = Math.min(maxZoom, Math.max(1, nextScaleRaw));
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const ratio = nextScale / scale;
    const nt = { x: px - (px - translate.x) * ratio, y: py - (py - translate.y) * ratio };
    setTranslate(clamp(nextScale, nt));
    setScale(nextScale);
  }

  // Zoom com a roda do mouse — listener nativo e não-passivo, pra poder
  // cancelar o scroll da página enquanto o cursor está sobre a imagem.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      zoomAt(e.clientX, e.clientY, scale + dir * 0.4);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, translate]);

  function onDoubleClick(e) {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      zoomAt(e.clientX, e.clientY, Math.min(maxZoom, 2.5));
    }
  }

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    draggedRef.current = false;

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
      } else if (swipeEnabled && e.pointerType === 'touch') {
        swipeRef.current = { startX: e.clientX, startY: e.clientY };
        panRef.current = null;
      }
      setIsDragging(true);
    }
  }

  function onPointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      draggedRef.current = true;
      const pts = [...pointersRef.current.values()];
      const dist1 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const { dist0, scale0, mid0, translate0 } = pinchRef.current;
      const nextScale = Math.min(maxZoom, Math.max(1, scale0 * (dist1 / dist0)));
      const ratio = nextScale / scale0;
      const nt = { x: mid0.x - (mid0.x - translate0.x) * ratio, y: mid0.y - (mid0.y - translate0.y) * ratio };
      setScale(nextScale);
      setTranslate(clamp(nextScale, nt));
      return;
    }

    if (panRef.current) {
      const dx = e.clientX - panRef.current.lastX;
      const dy = e.clientY - panRef.current.lastY;
      if (dx !== 0 || dy !== 0) draggedRef.current = true;
      panRef.current = { lastX: e.clientX, lastY: e.clientY };
      setTranslate((t) => clamp(scale, { x: t.x + dx, y: t.y + dy }));
      return;
    }

    if (swipeRef.current) {
      const dx = e.clientX - swipeRef.current.startX;
      const dy = e.clientY - swipeRef.current.startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) draggedRef.current = true;
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
        const width = ref.current?.getBoundingClientRect().width || 1;
        const threshold = Math.min(90, width * 0.18);
        if (Math.abs(dragPx) > threshold && onSwipeEnd) onSwipeEnd(dragPx < 0 ? 1 : -1);
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

  return {
    scale,
    translate,
    dragPx,
    isDragging,
    isPinching,
    hasDragged: () => draggedRef.current,
    reset: () => { setScale(1); setTranslate({ x: 0, y: 0 }); setDragPx(0); },
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onDoubleClick,
    },
  };
}

/**
 * ImageLightbox — visualizador em tela cheia genérico e reutilizável, com
 * zoom por roda do mouse / pinça, arraste quando ampliado, e navegação
 * entre itens sem fechar. Renderize via createPortal(..., document.body)
 * no componente que o usa, pra nunca ficar preso num ancestral com
 * `transform`/`overflow` (causa mais comum de modal "grudando" num canto).
 *
 * items: [{ src, alt, cta?: { label, href, external } }]
 */
export default function ImageLightbox({ items, activeIndex, maxZoom = 4, onClose, onNext, onPrev, onSelect }) {
  const wrapRef = useRef(null);
  const hasMultiple = items.length > 1;
  const zoom = useZoomGesture(wrapRef, {
    maxZoom,
    swipeEnabled: hasMultiple,
    onSwipeEnd: (dir) => { if (dir === 1) onNext(); else onPrev(); },
  });

  // Reseta zoom/posição ao trocar de item (ajuste de estado durante a
  // renderização, conforme o padrão recomendado pelo React em vez de usar
  // um efeito — evita um render extra em cascata).
  const [prevActiveIndex, setPrevActiveIndex] = useState(activeIndex);
  if (activeIndex !== prevActiveIndex) {
    setPrevActiveIndex(activeIndex);
    zoom.reset();
  }

  // Teclado: setas + ESC.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  // Trava o scroll da página enquanto está aberto.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const dragOffsetPx = zoom.scale <= 1 ? zoom.dragPx : 0;
  const active = items[activeIndex];

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
          aria-label="Item anterior"
          className="pg-arrow pg-arrow-left pg-lb-arrow"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <iconify-icon className="iconify" icon="mdi:chevron-left" style={{ fontSize: 26 }} />
        </button>
      )}

      <div
        ref={wrapRef}
        className="pg-lb-viewport"
        style={{ cursor: zoom.scale > 1 ? (zoom.isDragging ? 'grabbing' : 'grab') : (hasMultiple ? 'grab' : 'default') }}
        onPointerDown={zoom.handlers.onPointerDown}
        onPointerMove={zoom.handlers.onPointerMove}
        onPointerUp={zoom.handlers.onPointerUp}
        onPointerCancel={zoom.handlers.onPointerCancel}
        onDoubleClick={zoom.handlers.onDoubleClick}
      >
        <div className="pg-track">
          {items.map((item, i) => {
            const isActive = i === activeIndex;
            const basePercent = (i - activeIndex) * 100;
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={item.src}
                alt={item.alt || ''}
                draggable={false}
                className="pg-lb-slide"
                style={{
                  transform: isActive
                    ? `translate3d(calc(${basePercent}% + ${dragOffsetPx}px), 0, 0) translate3d(${zoom.translate.x}px, ${zoom.translate.y}px, 0) scale(${zoom.scale})`
                    : `translate3d(calc(${basePercent}% + ${dragOffsetPx}px), 0, 0)`,
                  transformOrigin: '0 0',
                  transition: (zoom.isDragging || zoom.isPinching) ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            );
          })}
        </div>
      </div>

      {hasMultiple && (
        <button
          type="button"
          aria-label="Próximo item"
          className="pg-arrow pg-arrow-right pg-lb-arrow"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <iconify-icon className="iconify" icon="mdi:chevron-right" style={{ fontSize: 26 }} />
        </button>
      )}

      {active?.cta && (
        <a
          href={active.cta.href}
          target={active.cta.external ? '_blank' : undefined}
          rel={active.cta.external ? 'noopener' : undefined}
          className="pg-lb-cta"
          onClick={(e) => e.stopPropagation()}
        >
          {active.cta.label}
        </a>
      )}

      {hasMultiple && (
        <div className="pg-dots pg-lb-dots">
          {items.map((_, i) => (
            <span
              key={i}
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
