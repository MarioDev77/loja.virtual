'use client';

import { useCart } from '@/context/CartContext';
import { useWish } from '@/context/WishContext';
import { brl } from '@/lib/format';

/**
 * WishPanel — réplica do #wishOverlay/.cart-panel do index.html, com a
 * lógica de renderWishPanel() do app.js. Lê dos snapshots salvos em
 * WishContext (nome/marca/imagem/preço), não da API — mesmo comportamento
 * do original.
 */
export default function WishPanel({ open, onClose, onToast }) {
  const { ids, snapshots, toggleWish } = useWish();
  const { addToCart } = useCart();

  function handleAddToCart(id) {
    const snap = snapshots[id];
    if (!snap) return;
    addToCart({ id, ...snap }, null, 1);
    if (onToast) onToast(`${snap.name} adicionado ao carrinho`, 'success');
  }

  function handleRemove(id) {
    toggleWish(id);
  }

  return (
    <div className={`cart-overlay${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Favoritos">
      <div className="cart-panel">
        <div className="cart-panel-head">
          <div>
            <p>Favoritos</p>
            <h3>{ids.length} {ids.length === 1 ? 'item' : 'itens'}</h3>
          </div>
          <button className="cart-close-btn" onClick={onClose} aria-label="Fechar favoritos">
            <span className="iconify" data-icon="mdi:close" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div>
          {ids.length === 0 && (
            <div className="wish-empty">
              <p>Nenhum favorito salvo ainda.</p>
              <p className="wish-empty-hint">Clique em ♡ num produto para salvá-lo aqui.</p>
            </div>
          )}

          {ids.map((id) => {
            const p = snapshots[id];
            return (
              <div className="cart-line-item" key={id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={(p && p.image) || ''} alt={(p && p.name) || 'Produto'} loading="lazy" />
                <div className="cart-line-info">
                  <div className="name">{(p && p.name) || `Produto #${id}`}</div>
                  <div className="meta">{(p && p.brand) || ''}</div>
                  {p && p.price ? <div className="cart-line-price">{brl(p.price)}</div> : null}
                  <button type="button" className="btn-wish-add" onClick={() => handleAddToCart(id)}>
                    Adicionar ao carrinho
                  </button>
                  <button type="button" className="cart-remove-btn" onClick={() => handleRemove(id)}>
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
