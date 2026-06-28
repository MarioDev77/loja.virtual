'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import CartPanel from '@/components/CartPanel';
import WishPanel from '@/components/WishPanel';
import { useToast } from '@/context/ToastContext';

/**
 * Layout da loja (route group "(loja)") — réplica da estrutura comum a
 * todas as páginas do front vanilla: navbar fixa, painel de carrinho,
 * painel de favoritos e footer. Não afeta a URL (route group).
 */
export default function StoreLayout({ children }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const showToast = useToast();

  return (
    <>
      <Navbar onOpenCart={() => setCartOpen(true)} onOpenWish={() => setWishOpen(true)} />

      {children}

      <footer>
        <p style={{ marginBottom: 6 }}>
          <strong style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px' }}>
            PITCH
          </strong>
          <span style={{ margin: '0 8px', opacity: 0.3 }}>·</span>
          Chuteiras Society, Futsal e Campo · Tênis e Blusas
        </p>
        <p>© 2026 Pitch Futebol. Todos os direitos reservados.</p>
      </footer>

      <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} />
      <WishPanel open={wishOpen} onClose={() => setWishOpen(false)} onToast={showToast} />
    </>
  );
}
