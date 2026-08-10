'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWish } from '@/context/WishContext';

const CATEGORIES = [
  { slug: 'society', label: 'Society' },
  { slug: 'futsal', label: 'Futsal' },
  { slug: 'campo', label: 'Campo' },
  { slug: 'acessorios', label: 'Acessórios' },
  { slug: 'blusas', label: 'Blusas' },
];

/**
 * Navbar — réplica do <nav id="navbar"> do index.html original, incluindo
 * o comportamento de "scrolled" (troca de fundo após 40px de scroll) e o
 * menu mobile. onOpenCart/onOpenWish vêm de fora porque os painéis (cart
 * panel / wish panel) vivem no layout da loja, não na navbar.
 */
export default function Navbar({ onOpenWish }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count: wishCount } = useWish();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav id="navbar" className={scrolled ? 'scrolled' : ''} role="navigation" aria-label="Navegação principal">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" aria-label="AG12 Sports — Início">
            <img src="/ag12-sports-logo.jpeg" alt="AG12 Sports" className="nav-logo-mark" />
            <span className="nav-brand">AG12 SPORTS</span>
          </Link>

          <div className="nav-links" role="menubar">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/produtos?cat=${c.slug}`} className="nav-link cat-tab" role="menuitem">
                {c.label}
              </Link>
            ))}
          </div>

          <div className="nav-actions">
            <button className="nav-cart-btn" onClick={onOpenWish} aria-label="Favoritos" style={{ position: 'relative' }} title="Favoritos">
              <iconify-icon className="iconify" icon="mdi:heart-outline" style={{ fontSize: 18 }} />
              <span aria-label="favoritos salvos">{wishCount > 0 ? wishCount : ''}</span>
            </button>
            <button
              className="nav-hamburger"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
            >
              <iconify-icon className="iconify" icon="mdi:menu" style={{ fontSize: 20 }} />
            </button>
          </div>
        </div>
      </nav>

      <div id="mobileMenu" className={mobileOpen ? 'open' : ''} role="dialog" aria-label="Menu de navegação" aria-modal="true">
        <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />
        <div id="mobileMenuPanel">
          <div className="mobile-header">
            <span className="mobile-title">Menu</span>
            <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
              <iconify-icon className="iconify" icon="mdi:close" style={{ fontSize: 18 }} />
            </button>
          </div>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/produtos?cat=${c.slug}`}
              className="mobile-link cat-tab"
              onClick={() => setMobileOpen(false)}
            >
              {c.label}
            </Link>
          ))}
          <Link href="/produtos" className="mobile-link accent" onClick={() => setMobileOpen(false)}>
            ← Ver todos os produtos
          </Link>
        </div>
      </div>
    </>
  );
}
