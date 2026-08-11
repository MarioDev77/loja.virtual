'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const WPP_NUMBER = '557598756510';
const AUTOPLAY_MS = 4500;

const SLIDES = [
  {
    tone: 'tone-amber',
    icon: 'mdi:soccer',
    title: 'Garanta suas chuteiras',
    text: 'Society, Futsal e Campo — direto no WhatsApp, com fotos e vídeos reais do estoque.',
    cta: 'Ver catálogo →',
    href: '/produtos',
  },
  {
    tone: 'tone-ink',
    icon: 'mdi:whatsapp',
    title: 'Atendimento rápido',
    text: 'Fale agora com a gente e receba preço, tamanhos e disponibilidade na hora.',
    cta: 'Falar no WhatsApp →',
    href: `https://wa.me/${WPP_NUMBER}?text=${encodeURIComponent('Olá! Quero saber mais sobre os produtos da AG12 Sports.')}`,
    external: true,
  },
  {
    tone: 'tone-ink-2',
    icon: 'mdi:truck-fast-outline',
    title: 'Entrega pra todo o Brasil',
    text: 'Compre com confiança e receba no conforto de casa.',
    cta: 'Saiba mais →',
    href: '/produtos',
  },
  {
    tone: 'tone-amber',
    icon: 'mdi:new-box',
    title: 'Novidades toda semana',
    text: 'Lançamentos e chegadas exclusivas AG12 Sports antes de todo mundo.',
    cta: 'Ver ofertas →',
    href: '/produtos',
  },
];

/**
 * Faixa promocional em carrossel: passa automaticamente sozinha (como o
 * banner de referência) e também aceita arrastar o dedo/mouse pros lados
 * a qualquer momento — a rolagem manual pausa o autoplay por alguns
 * segundos e depois ele volta a andar sozinho.
 */
export default function PromoBanner() {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const resumeTimeoutRef = useRef(null);
  const isPausedRef = useRef(false);

  const goTo = useCallback((index) => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.children[index];
    if (!slide) return;
    el.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
  }, []);

  // Autoplay: avança um slide a cada intervalo, voltando ao início no fim.
  useEffect(() => {
    const timer = setInterval(() => {
      if (isPausedRef.current) return;
      setActive((prev) => {
        const next = (prev + 1) % SLIDES.length;
        goTo(next);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [goTo]);

  // Mantém "active" em sincronia quando o usuário arrasta manualmente,
  // e pausa o autoplay por alguns segundos após a interação.
  function handleManualScroll() {
    const el = trackRef.current;
    if (!el) return;

    isPausedRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => { isPausedRef.current = false; }, 6000);

    let closestIndex = 0;
    let closestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const dist = Math.abs(child.offsetLeft - el.scrollLeft);
      if (dist < closestDist) { closestDist = dist; closestIndex = i; }
    });
    setActive(closestIndex);
  }

  useEffect(() => () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  }, []);

  return (
    <section id="promoBanner" aria-label="Destaques e promoções">
      <div
        className="promo-track"
        ref={trackRef}
        onScroll={handleManualScroll}
        onMouseEnter={() => { isPausedRef.current = true; }}
        onMouseLeave={() => { isPausedRef.current = false; }}
        onTouchStart={() => { isPausedRef.current = true; }}
      >
        {SLIDES.map((s, i) => (
          <a
            key={i}
            href={s.href}
            target={s.external ? '_blank' : undefined}
            rel={s.external ? 'noopener' : undefined}
            className={`promo-slide ${s.tone}`}
          >
            <iconify-icon className="promo-icon iconify" icon={s.icon} />
            <div>
              <p className="promo-title">{s.title}</p>
              <p className="promo-text" style={{ margin: '8px 0 14px' }}>{s.text}</p>
              <span className="promo-cta">{s.cta}</span>
            </div>
          </a>
        ))}
      </div>

      <div className="promo-dots" role="tablist" aria-label="Selecionar destaque">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-label={`Ir para o destaque ${i + 1}`}
            className={`promo-dot${active === i ? ' active' : ''}`}
            onClick={() => {
              isPausedRef.current = true;
              if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
              resumeTimeoutRef.current = setTimeout(() => { isPausedRef.current = false; }, 6000);
              setActive(i);
              goTo(i);
            }}
          />
        ))}
      </div>
    </section>
  );
}
