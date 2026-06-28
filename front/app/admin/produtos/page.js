'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/app/admin/layout';
import { apiRequest, apiUpload, API_BASE } from '@/lib/api';
import { brl } from '@/lib/format';

const ADMIN_PREFIX = '/manage';
const CATEGORIES   = ['society', 'futsal', 'campo', 'tenis', 'blusas'];

const EMPTY_FORM = {
  name: '', brand: '', category: 'society', price: '', oldPrice: '',
  description: '', sizes: '', stock_qty: 0, is_active: true, is_featured: false,
};

export default function AdminProdutosPage() {
  const router = useRouter();
  const { token, adminRequest, isAuthenticated } = useAdminAuth();

  const [products, setProducts] = useState([]);
  const [status,   setStatus]   = useState('loading');
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);

  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [formData,   setFormData]   = useState(EMPTY_FORM);
  const [imageFile,  setImageFile]  = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/admin/login'); return; }
    loadProducts(1);
  }, [isAuthenticated]);

  async function loadProducts(p) {
    setStatus('loading');
    try {
      const data = await adminRequest(`/products?page=${p}&limit=20`);
      setProducts(data.products || []);
      setHasMore(!!data.hasMore);
      setPage(p);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  function openCreate() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setImageFile(null);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(product) {
    setEditingId(product.id);
    setFormData({
      name:        product.name || '',
      brand:       product.brand || '',
      category:    product.category || 'society',
      price:       product.price || '',
      oldPrice:    product.oldPrice || '',
      description: product.desc || '',
      sizes:       (product.sizes || []).join(', '),
      stock_qty:   product.stock_qty ?? 0,
      is_active:   product.is_active !== false,
      is_featured: !!product.is_featured,
    });
    setImageFile(null);
    setFormError('');
    setShowForm(true);
  }

  function handleFieldChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const fd = new FormData();
      fd.append('name',        formData.name.trim());
      fd.append('brand',       formData.brand.trim());
      fd.append('category',    formData.category);
      fd.append('price',       formData.price);
      if (formData.oldPrice) fd.append('old_price', formData.oldPrice);
      fd.append('description', formData.description.trim());
      fd.append('sizes_json',  JSON.stringify(
        formData.sizes.split(',').map((s) => s.trim()).filter(Boolean)
      ));
      fd.append('stock_qty',   formData.stock_qty);
      fd.append('is_active',   formData.is_active ? '1' : '0');
      fd.append('is_featured', formData.is_featured ? '1' : '0');
      if (imageFile) fd.append('image', imageFile);

      const path   = editingId ? `${ADMIN_PREFIX}/products/${editingId}` : `${ADMIN_PREFIX}/products`;
      const method = editingId ? 'PATCH' : 'POST';

      await apiUpload(path, { method, formData: fd, token });

      setShowForm(false);
      loadProducts(page);
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product) {
    try {
      const fd = new FormData();
      fd.append('is_active', product.is_active ? '0' : '1');
      await apiUpload(`${ADMIN_PREFIX}/products/${product.id}`, { method: 'PATCH', formData: fd, token });
      setProducts((prev) => prev.map((p) =>
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ));
    } catch (err) {
      alert('Erro: ' + (err.message || 'Tente novamente.'));
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Produtos</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Gerencie o catálogo da loja.</p>
        </div>
        <button onClick={openCreate} className="btn-primary" style={{ fontSize: 13 }}>
          <span className="iconify" data-icon="mdi:plus" style={{ fontSize: 18 }} />
          Novo produto
        </button>
      </div>

      {/* Modal de formulário */}
      {showForm && (
        <div className="modal-overlay open" role="dialog" aria-modal="true" aria-label={editingId ? 'Editar produto' : 'Novo produto'}>
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <div style={{ padding: '28px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>
                {editingId ? 'Editar produto' : 'Novo produto'}
              </h2>
              <button onClick={() => setShowForm(false)} className="modal-close-btn" aria-label="Fechar">
                <span className="iconify" data-icon="mdi:close" style={{ fontSize: 15 }} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 28 }}>
              <div className="checkout-form-grid">
                <input type="text" placeholder="Nome do produto" className="field-input" required value={formData.name} onChange={(e) => handleFieldChange('name', e.target.value)} />
                <input type="text" placeholder="Marca" className="field-input" required value={formData.brand} onChange={(e) => handleFieldChange('brand', e.target.value)} />

                <select className="sort-select field-input" value={formData.category} onChange={(e) => handleFieldChange('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>

                <input type="number" placeholder="Preço (ex: 299.90)" className="field-input" required step="0.01" min="0" value={formData.price} onChange={(e) => handleFieldChange('price', e.target.value)} />
                <input type="number" placeholder="Preço antigo (opcional)" className="field-input" step="0.01" min="0" value={formData.oldPrice} onChange={(e) => handleFieldChange('oldPrice', e.target.value)} />
                <input type="text" placeholder="Tamanhos (ex: 38, 39, 40, 41)" className="field-input" value={formData.sizes} onChange={(e) => handleFieldChange('sizes', e.target.value)} />
                <input type="number" placeholder="Estoque" className="field-input" min="0" value={formData.stock_qty} onChange={(e) => handleFieldChange('stock_qty', Number(e.target.value))} />

                <textarea
                  placeholder="Descrição"
                  className="field-input field-full"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  style={{ resize: 'vertical' }}
                />

                <div className="field-full" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, color: 'var(--muted)' }}>Imagem do produto</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ fontSize: 13 }}
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                  {editingId && !imageFile && (
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>Deixe vazio para manter a imagem atual.</p>
                  )}
                </div>

                <div className="field-full" style={{ display: 'flex', gap: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.is_active} onChange={(e) => handleFieldChange('is_active', e.target.checked)} />
                    Ativo
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.is_featured} onChange={(e) => handleFieldChange('is_featured', e.target.checked)} />
                    Destaque
                  </label>
                </div>

                {formError && <div className="error-box field-full">{formError}</div>}

                <div className="checkout-nav field-full">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Salvando…' : (editingId ? 'Salvar alterações' : 'Criar produto')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de produtos */}
      {status === 'loading' && <p style={{ color: 'var(--muted)' }}>Carregando produtos…</p>}
      {status === 'error'   && <p style={{ color: 'var(--muted)' }}>Erro ao carregar. Tente novamente.</p>}

      {status === 'ready' && (
        <>
          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', background: 'var(--bg)' }}>
                    {['Imagem', 'Produto', 'Marca', 'Categoria', 'Preço', 'Estoque', 'Status', 'Ações'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!products.length && (
                    <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Nenhum produto encontrado.</td></tr>
                  )}
                  {products.map((product) => (
                    <tr key={product.id} style={{ borderBottom: '1px solid var(--border)', opacity: product.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: '10px 16px' }}>
                        {product.image
                          ? <img src={product.image} alt={product.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                          : <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--border)' }} />
                        }
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{product.name}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>{product.brand}</td>
                      <td style={{ padding: '10px 16px', textTransform: 'capitalize' }}>{product.category}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--amber-dk)', fontFamily: 'var(--font-display)' }}>{brl(product.price)}</td>
                      <td style={{ padding: '10px 16px' }}>{product.stock_qty ?? '—'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, background: product.is_active ? 'var(--green, #22c55e)' : 'var(--muted)', color: '#fff', fontWeight: 600 }}>
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEdit(product)} className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>
                            Editar
                          </button>
                          <button onClick={() => toggleActive(product)} className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>
                            {product.is_active ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
            {page > 1 && (
              <button className="btn-secondary" onClick={() => loadProducts(page - 1)} style={{ fontSize: 13 }}>← Anterior</button>
            )}
            {hasMore && (
              <button className="btn-secondary" onClick={() => loadProducts(page + 1)} style={{ fontSize: 13 }}>Próxima →</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
