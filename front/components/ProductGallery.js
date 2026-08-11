'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { productImageUrl } from '@/lib/api';

/**
 * ProductGallery — galeria de imagens do produto na página de detalhe da loja.
 *
 * - Imagem principal + miniaturas, troca ao clicar numa miniatura.
 * - Arrastar com o mouse ou o dedo desliza entre as fotos, com animação de
 *   "mola" ao soltar (segue o arrasto em tempo real, e ao soltar encaixa
 *   na foto mais próxima).
 * - Setas e teclado (← →) continuam funcionando.
 * - Lightbox em tela cheia: clicar na própria foto não faz nada; clicar em
 *   qualquer área fora da foto (ou no X) fecha e volta pra tela normal.
 * - Se o produto tiver só 1 imagem, arraste/setas ficam desativados.
 */
export default function ProductGallery({ images, productName }) {
  const gallery = (images && images.length > 0)
    ? images
    : [{ url: '', isPrimary: true }];

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const hasMultiple = gallery.length > 1;

  // Reseta ao trocar de produto (evita índice fora do array).
  useEffect(() => { setActiveIndex(0); }, [images]);

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

  // ── Lógica de arrasto (mouse + toque), compartilhada entre a imagem
  //    principal e o lightbox ────────────────────────────────────────────
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const draggedRef = useRef(false);
  const containerWidthRef = useRef(1);

  function handlePointerDown(e) {
    if (!hasMultiple) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    draggedRef.current = false;
    containerWidthRef.current = e.currentTarget.getBoundingClientRect().width || 1;
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) draggedRef.current = true;
    // Só segue o arrasto se o gesto for predominantemente horizontal, pra
    // não brigar com o scroll vertical da página no celular.
    if (Math.abs(dx) >= Math.abs(dy)) setDragOffset(dx);
  }

  // onTap: chamado quando foi um clique/toque de verdade (sem arrastar).
  // Recebe o evento pra quem chamou decidir o que fazer (abrir/fechar etc).
  function makePointerUp(onTap) {
    return (e) => {
      const width = containerWidthRef.current || 1;
      const threshold = Math.min(90, width * 0.18);
      setIsDragging(false);
      if (hasMultiple && Math.abs(dragOffset) > threshold) {
        if (dragOffset < 0) next(); else prev();
      } else if (!draggedRef.current) {
        onTap && onTap(e);
      }
      setDragOffset(0);
    };
  }

  const trackTransform = `translateX(calc(-${activeIndex * (100 / gallery.length)}% + ${dragOffset}px))`;
  const trackTransition = isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <div>
      {/* Imagem principal */}
      <div
        className="modal-img"
        style={{
          borderRadius: 16, overflow: 'hidden', background: 'var(--surface)',
          aspectRatio: '1', position: 'relative',
          cursor: hasMultiple ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          touchAction: 'pan-y', userSelect: isDragging ? 'none' : 'auto',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={makePointerUp(() => activeUrl && setLightboxOpen(true))}
        onPointerCancel={makePointerUp(null)}
      >
        {activeUrl ? (
          <div style={{ display: 'flex', width: `${gallery.length * 100}%`, height: '100%', transform: trackTransform, transition: trackTransition }}>
            {gallery.map((img, i) => (
              <div key={img.id || i} style={{ flex: `0 0 ${100 / gallery.length}%`, height: '100%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImageUrl(img.url)}
                  alt={productName || 'Produto'}
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', WebkitUserDrag: 'none' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>
            Sem imagem
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              aria-label="Imagem anterior"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); prev(); }}
              style={navBtnStyle('left')}
            >
              <iconify-icon className="iconify" icon="mdi:chevron-left" style={{ fontSize: 22 }} />
            </button>
            <button
              type="button"
              aria-label="Próxima imagem"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); next(); }}
              style={navBtnStyle('right')}
            >
              <iconify-icon className="iconify" icon="mdi:chevron-right" style={{ fontSize: 22 }} />
            </button>

            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 10, display: 'flex', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
              {gallery.map((img, i) => (
                <span
                  key={img.id || i}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: i === activeIndex ? 'var(--amber-dk, #d6a330)' : 'rgba(255,255,255,0.7)',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
                    transition: 'background 0.2s ease, transform 0.2s ease',
                    transform: i === activeIndex ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
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
              onClick={() => goTo(i)}
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
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
            }}
          >
            <iconify-icon className="iconify" icon="mdi:close" style={{ fontSize: 20 }} />
          </button>

          {hasMultiple && (
            <button
              type="button"
              aria-label="Imagem anterior"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              style={{ ...navBtnStyle('left'), left: 16, zIndex: 1 }}
            >
              <iconify-icon className="iconify" icon="mdi:chevron-left" style={{ fontSize: 26 }} />
            </button>
          )}

          {/* Área arrastável: clicar fora da foto fecha; clicar/arrastar na
              foto não fecha, só navega quando o arrasto passa do limite. */}
          <div
            style={{
              width: '100%', height: '100%', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              touchAction: 'pan-y', cursor: hasMultiple ? (isDragging ? 'grabbing' : 'grab') : 'default',
              userSelect: isDragging ? 'none' : 'auto',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={makePointerUp((e) => {
              // Tocou/clicou sem arrastar: só fecha se não foi na própria imagem.
              if (e.target.tagName !== 'IMG') setLightboxOpen(false);
            })}
            onPointerCancel={makePointerUp(null)}
          >
            <div style={{ display: 'flex', width: `${gallery.length * 100}%`, height: '100%', transform: trackTransform, transition: trackTransition }}>
              {gallery.map((img, i) => (
                <div
                  key={img.id || i}
                  style={{ flex: `0 0 ${100 / gallery.length}%`, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={productImageUrl(img.url)}
                    alt={productName || 'Produto'}
                    draggable={false}
                    style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, WebkitUserDrag: 'none' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {hasMultiple && (
            <button
              type="button"
              aria-label="Próxima imagem"
              onClick={(e) => { e.stopPropagation(); next(); }}
              style={{ ...navBtnStyle('right'), right: 16, zIndex: 1 }}
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
