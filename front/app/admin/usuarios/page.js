'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/app/admin/layout';

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { adminRequest, isAuthenticated } = useAdminAuth();

  const [users,   setUsers]   = useState([]);
  const [status,  setStatus]  = useState('loading');
  const [page,    setPage]    = useState(1);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/admin/login'); return; }
    load(1);
  }, [isAuthenticated]);

  async function load(p) {
    setStatus('loading');
    try {
      const data = await adminRequest(`/users?page=${p}&limit=30`);
      setUsers(data.users || []);
      setPage(p);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function updateRole(userId, role) {
    setUpdating(`role:${userId}`);
    try {
      await adminRequest(`/users/${userId}/role`, { method: 'PATCH', body: { role } });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
    } catch (err) {
      alert('Erro: ' + (err.message || 'Tente novamente.'));
    } finally {
      setUpdating(null);
    }
  }

  async function updateActive(userId, is_active) {
    setUpdating(`active:${userId}`);
    try {
      await adminRequest(`/users/${userId}/status`, { method: 'PATCH', body: { is_active } });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active } : u));
    } catch (err) {
      alert('Erro: ' + (err.message || 'Tente novamente.'));
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Usuários</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Gerencie os cadastros de clientes e admins.</p>
        </div>
        <button onClick={() => load(page)} className="btn-secondary" style={{ fontSize: 13 }}>
          <span className="iconify" data-icon="mdi:refresh" style={{ fontSize: 16 }} />
          Atualizar
        </button>
      </div>

      {status === 'loading' && <p style={{ color: 'var(--muted)' }}>Carregando usuários…</p>}
      {status === 'error'   && <p style={{ color: 'var(--muted)' }}>Erro ao carregar. Tente novamente.</p>}

      {status === 'ready' && (
        <>
          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', background: 'var(--bg)' }}>
                    {['#', 'Nome', 'Usuário', 'E-mail', 'Telefone', 'Role', 'Status', 'Cadastro', 'Ações'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!users.length && (
                    <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Nenhum usuário encontrado.</td></tr>
                  )}
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', opacity: user.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{user.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{user.name || '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{user.username || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>{user.email}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{user.phone || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={user.role}
                          onChange={(e) => updateRole(user.id, e.target.value)}
                          disabled={updating === `role:${user.id}`}
                          className="sort-select"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                        >
                          <option value="user">Usuário</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, background: user.is_active ? 'var(--green, #22c55e)' : 'var(--muted)', color: '#fff', fontWeight: 600 }}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => updateActive(user.id, !user.is_active)}
                          disabled={updating === `active:${user.id}`}
                          className="btn-secondary"
                          style={{ fontSize: 12, padding: '4px 10px' }}
                        >
                          {user.is_active ? 'Bloquear' : 'Desbloquear'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {page > 1 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => load(page - 1)} style={{ fontSize: 13 }}>← Anterior</button>
              <button className="btn-secondary" onClick={() => load(page + 1)} style={{ fontSize: 13 }}>Próxima →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
