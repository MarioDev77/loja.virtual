'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

// ——— Contexto de autenticação admin ———
const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth deve ser usado dentro de AdminLayout');
  return ctx;
}

const ADMIN_PREFIX = '/manage';

const NAV_ITEMS = [
  { href: '/admin',          icon: 'mdi:view-dashboard-outline', label: 'Dashboard' },
  { href: '/admin/pedidos',  icon: 'mdi:clipboard-list-outline', label: 'Pedidos' },
  { href: '/admin/produtos', icon: 'mdi:package-variant-outline', label: 'Produtos' },
  { href: '/admin/usuarios', icon: 'mdi:account-group-outline',  label: 'Usuários' },
];

export default function AdminLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [token, setToken] = useState(null);
  const [user,  setUser]  = useState(null);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    router.push('/admin/login');
  }, [router]);

  const adminRequest = useCallback(
    (path, options = {}) => apiRequest(`${ADMIN_PREFIX}${path}`, { ...options, token }),
    [token]
  );

  const value = { token, setToken, user, setUser, logout, adminRequest, isAuthenticated: !!token };

  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return (
      <AdminAuthContext.Provider value={value}>
        {children}
      </AdminAuthContext.Provider>
    );
  }

  if (!token) {
    // Redireciona para login se não autenticado
    if (typeof window !== 'undefined') router.push('/admin/login');
    return null;
  }

  return (
    <AdminAuthContext.Provider value={value}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Sidebar */}
        <aside style={{
          width: 220,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          padding: '32px 0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="nav-logo-mark" style={{ width: 32, height: 32 }}><span>P</span></div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px' }}>PITCH</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Admin</p>
          </div>

          <nav style={{ flex: 1, padding: '0 12px' }}>
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    marginBottom: 4,
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--amber)' : 'var(--text)',
                    background: active ? 'rgba(var(--amber-rgb,214,163,48),0.1)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <span className="iconify" data-icon={item.icon} style={{ fontSize: 18 }} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            {user && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username || user.email}
              </p>
            )}
            <button onClick={logout} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
              Sair
            </button>
          </div>
        </aside>

        {/* Conteúdo */}
        <main style={{ flex: 1, padding: '40px 32px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </AdminAuthContext.Provider>
  );
}
