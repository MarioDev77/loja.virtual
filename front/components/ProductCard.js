'use client';

import { useRouter } from 'next/navigation';
import { useWish } from '@/context/WishContext';
import { brl } from '@/lib/format';

/**
 * ProductCard — réplica de renderProductCard() em front/assets/app.js.
 * Clicar no card abre a página do produto (era um modal no original — ver
 * decisão de rotas reais confirmada com o usuário). Clicar no coração
 * favorita sem navegar (stopPropagation, igual ao original).
 */
export default function ProductCard({ product, onToast }) {
  const router = useRouter();
  const { isWished, toggleWish } = useWish();

  const wished = isWished(product.id);
  const hasDiscount = product.oldPrice && product.oldPrice > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  function handleWishClick(e) {
    e.stopPropagation();
    const nowWished = toggleWish(product.id, product);
    if (onToast) {
      onToast(
        nowWished ? `${product.name} salvo nos favoritos ♡` : `${product.name} removido dos favoritos`,
        nowWished ? 'success' : 'info'
      );
    }
  }

  return (
    <div className="product-card" onClick={() => router.push(`/produto/${product.id}`)}>
      <div className="product-img-wrap">
        {hasDiscount && <span className="product-badge off">-{discountPct}%</span>}
        <button
          type="button"
          className={`wish-btn${wished ? ' wished' : ''}`}
          title={wished ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-label={`Favoritar ${product.name}`}
          onClick={handleWishClick}
        >
          {wished ? '♥' : '♡'}
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image || ''} alt={product.name || 'Produto'} loading="lazy" />
      </div>
      <div className="body">
        <span className="brand">{product.brand || ''}</span>
        <h3 className="name">{product.name || ''}</h3>
        <div className="price-row">
          {hasDiscount && <span className="price-old">{brl(product.oldPrice)}</span>}
          <span className="price-now">{brl(product.price)}</span>
        </div>
      </div>
    </div>
  );
}
