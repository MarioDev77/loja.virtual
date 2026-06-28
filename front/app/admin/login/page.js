'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/app/admin/layout';
import { apiRequest } from '@/lib/api';

export default function AdminLoginPage() {
  const router            = useRouter();
  const { setToken, setUser } = useAdminAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Preencha usuário e senha.'); return; }
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { username, password },
      });
      if (data.user?.role !== 'admin') {
        setError('Esta conta não tem acesso ao painel admin.');
        return;
      }
      setToken(data.token);
      setUser(data.user);
      router.push('/admin');
    } catch (err) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.12)', padding: '40px 36px', width: '100%', maxWidth: 440 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="nav-logo-mark"><span>P</span></div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>PITCH</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Painel Admin</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Área reservada. Apenas pessoal autorizado.</p>
        </div>

        <div className="checkout-form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <input
            type="text"
            placeholder="Usuário ou e-mail"
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
            onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
          />
          {error && <div className="error-box">{error}</div>}
          <button onClick={handleLogin} className="btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
