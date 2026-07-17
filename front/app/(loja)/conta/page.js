'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useWish } from '@/context/WishContext';
import { brl } from '@/lib/format';

export default function ContaPage() {
  const { user, login, logout, isAuthenticated } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [logging,  setLogging]  = useState(false);

  const { ids: wishIds, snapshots: wishSnapshots, toggleWish } = useWish();

  async function handleLogin(e) {
    e.preventDefault();
    setLoginErr('');
    if (!username || !password) { setLoginErr('Preencha usuário e senha.'); return; }
    setLogging(true);
    try {
      await login(username, password);
    } catch (err) {
      setLoginErr(err.message || 'Falha ao autenticar.');
    } finally {
      setLogging(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div style={{ paddingTop: 100, display: 'flex', justifyContent: 'center', padding: '100px 24px 60px' }}>
        <div className="modal-content" style={{ width: '100%', maxWidth: 440 }}>
          <div className="checkout-body">
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted)', marginBottom: 24 }}>
              Entrar na minha conta
            </p>
            <div className="checkout-form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <input
                type="text"
                placeholder="E-mail ou usuário"
                className="field-input"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Senha"
                className="field-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {loginErr && <div className="error-box">{loginErr}</div>}
              <button onClick={handleLogin} className="btn-primary" style={{ justifyContent: 'center' }} disabled={logging}>
                {logging ? 'Entrando…' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Minha conta</h1>
          {user && <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>{user.email || user.username}</p>}
        </div>
        <button onClick={logout} className="btn-secondary">Sair</button>
      </div>

      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          Meus favoritos {wishIds.length > 0 ? `(${wishIds.length})` : ''}
        </h2>

        {wishIds.length === 0 && (
          <div id="emptyState" role="status">
            <span className="iconify" data-icon="mdi:heart-outline" style={{ fontSize: 36, color: 'var(--muted)', marginBottom: 12 }} />
            <h3>Nenhum favorito ainda</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>Clique no ♡ de um produto para salvá-lo aqui.</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {wishIds.map((id) => {
            const p = wishSnapshots[id];
            return (
              <div key={id} style={{ background: 'var(--surface)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
                <Link href={`/produto/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={(p && p.image) || ''}
                    alt={(p && p.name) || 'Produto'}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, marginBottom: 10 }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>{(p && p.brand) || ''}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{(p && p.name) || `Produto #${id}`}</p>
                  {p && p.price ? (
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--amber-dk)', marginTop: 4 }}>{brl(p.price)}</p>
                  ) : null}
                </Link>
                <button
                  type="button"
                  onClick={() => toggleWish(id)}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 13 }}
                >
                  Remover dos favoritos
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
