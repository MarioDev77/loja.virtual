const WPP_NUMBER = '557598756510';

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
 * Faixa promocional com rolagem horizontal (arraste/scroll pros lados),
 * no estilo do banner de destaque pedido como referência.
 */
export default function PromoBanner() {
  return (
    <section id="promoBanner" aria-label="Destaques e promoções">
      <div className="promo-track">
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
    </section>
  );
}
