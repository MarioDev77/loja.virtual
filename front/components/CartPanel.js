'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { brl } from '@/lib/format';

// Mesmos dados de contato do app.js original — centralizar aqui evita
// duplicar a constante em vários componentes.
const WPP_NUMBER = '5511999999999';
const WPP_BASE = `https://wa.me/${WPP_NUMBER}`;
const IG_URL = 'https://instagram.com/pitch.futebol';

/**
 * CartPanel — réplica do #cartOverlay/.cart-panel do index.html, com a
 * lógica de renderCartPanel() do app.js. `open`/`onClose` controlam a
 * visibilidade (equivalente à classe .open alternada por toggleCart()).
 */
export default function CartPanel({ open, onClose }) {
  const router = useRouter();
  const { items, subtotal, updateQty, removeFromCart } = useCart();

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const wppText = encodeURIComponent('Olá! Gostaria de finalizar minha compra na Pitch Futebol.');

  function handleCheckout() {
    onClose();
    router.push('/checkout');
  }

  return (
    <div className={`cart-overlay${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Carrinho de compras">
      <div className="cart-panel">
        <div className="cart-panel-head">
          <div>
            <p>Carrinho</p>
            <h3>{totalQty} {totalQty === 1 ? 'item' : 'itens'}</h3>
          </div>
          <button className="cart-close-btn" onClick={onClose} aria-label="Fechar carrinho">
            <span className="iconify" data-icon="mdi:close" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div>
          {items.length === 0 && <p>Seu carrinho está vazio.</p>}

          {items.map((it) => (
            <div className="cart-line-item" key={`${it.productId}:${it.size || ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image || ''} alt={it.name || ''} />
              <div className="cart-line-info">
                <div className="name">{it.name || ''}</div>
                <div className="meta">Tam. {it.size || '—'} · {it.brand || ''}</div>
                <div className="qty-stepper">
                  <button type="button" onClick={() => updateQty(it.productId, it.size, it.qty - 1)}>−</button>
                  <span>{it.qty}</span>
                  <button type="button" onClick={() => updateQty(it.productId, it.size, it.qty + 1)}>+</button>
                </div>
              </div>
              <div className="cart-line-price-col">
                <div className="cart-line-price">{brl(it.unitPrice * it.qty)}</div>
                <button type="button" className="cart-remove-btn" onClick={() => removeFromCart(it.productId, it.size)}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div id="cartFooter" style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total</span>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--amber-dk)' }}>
                {brl(subtotal)}
              </strong>
            </div>
            <button onClick={handleCheckout} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Finalizar compra
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <a
                href={`${WPP_BASE}?text=${wppText}`}
                target="_blank"
                rel="noopener"
                style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <span className="iconify" data-icon="mdi:whatsapp" /> WhatsApp
              </a>
              <a
                href={IG_URL}
                target="_blank"
                rel="noopener"
                style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <span className="iconify" data-icon="mdi:instagram" /> Instagram
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
