'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { apiRequest, API_BASE } from '@/lib/api';
import { brl } from '@/lib/format';

// ——— Máscaras (réplica fiel do app.js original) ———
function maskCpf(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length > 9) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  if (d.length > 6) return d.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  if (d.length > 3) return d.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  return d;
}
function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length > 10) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length > 6)  return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  if (d.length > 2)  return d.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  if (d.length > 0)  return `(${d}`;
  return d;
}
function maskCep(v) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? d.replace(/(\d{5})(\d{1,3})/, '$1-$2') : d;
}

function StepCircle({ n, status }) {
  return (
    <div
      id={`step${n}Circle`}
      className={`step-circle ${status}`}
      aria-label={`Etapa ${n}`}
    >
      {status === 'done' ? '✓' : n}
    </div>
  );
}

export default function CheckoutPage() {
  const router    = useRouter();
  const showToast = useToast();
  const { items, subtotal, clearCart } = useCart();
  const { token, login, register, clearSession } = useAuth();

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Step 1 — dados do cliente
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [cpf,      setCpf]      = useState('');
  const [password, setPassword] = useState('');
  const [authErr,  setAuthErr]  = useState('');

  // Step 2 — endereço
  const [cep,    setCep]    = useState('');
  const [street, setStreet] = useState('');
  const [num,    setNum]    = useState('');
  const [comp,   setComp]   = useState('');
  const [bairro, setBairro] = useState('');
  const [city,   setCity]   = useState('');
  const [state,  setState]  = useState('');

  // Step 3 — pagamento
  const [payment, setPayment] = useState('pix');
  const [orderErr, setOrderErr] = useState('');

  if (!items.length && !success) {
    return (
      <div style={{ paddingTop: 120, textAlign: 'center' }}>
        <span className="iconify" data-icon="mdi:cart-off" style={{ fontSize: 48, color: 'var(--muted)' }} />
        <h2 style={{ marginTop: 16 }}>Carrinho vazio</h2>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>Adicione produtos antes de finalizar a compra.</p>
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => router.push('/')}>
          ← Ir às compras
        </button>
      </div>
    );
  }

  // ——— Validações ———
  function validateStep1() {
    if (!name || !email || !phone || !password) {
      showToast('Preencha nome, e-mail, telefone e senha para continuar', 'error');
      return false;
    }
    if (password.length < 8) {
      showToast('A senha precisa ter no mínimo 8 caracteres', 'error');
      return false;
    }
    return true;
  }

  function validateStep2() {
    if (!cep || !street || !num || !bairro || !city || !state) {
      showToast('Preencha todos os campos de endereço', 'error');
      return false;
    }
    return true;
  }

  // ——— Garante sessão (login ou registro) ———
  async function ensureSession() {
    setAuthErr('');
    if (token) return true;
    setLoading(true);
    try {
      // Tenta login
      const safeUsername = email.replace(/[^\w@.\-]/g, '');
      let loginOk = false;
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password }),
        });
        if (res.ok) {
          const d = await res.json();
          await login(email, password).catch(() => null); // propaga token pro AuthContext
          loginOk = true;
        }
      } catch {}

      if (!loginOk) {
        // Tenta registro
        try {
          await register({ name, username: safeUsername, email, password, phone, cpf: cpf || undefined });
        } catch (err) {
          if (err.status === 409) {
            setAuthErr('Este e-mail já tem cadastro e a senha informada não confere.');
          } else {
            setAuthErr(err.message || 'Não foi possível validar seus dados.');
          }
          return false;
        }
      }
      return true;
    } catch {
      setAuthErr('Não foi possível conectar à loja agora. Verifique sua internet.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function goToStep(target) {
    if (target === 2) {
      if (!validateStep1()) return;
      const ok = await ensureSession();
      if (!ok) return;
    }
    if (target === 3 && !validateStep2()) return;
    setStep(target);
  }

  // ——— Finaliza pedido ———
  async function finishOrder() {
    if (!items.length) return;
    setOrderErr('');
    setLoading(true);

    const payload = {
      customer: { name, email, phone, cpf },
      address:  { cep, street, number: num, complement: comp, bairro, city, state: state.toUpperCase().slice(0, 2) },
      payment:  { method: payment },
      items:    items.map((it) => ({ productId: it.productId, size: it.size || '—', qty: it.qty })),
    };

    try {
      await apiRequest('/orders', { method: 'POST', body: payload, token });
      clearCart();
      setSuccess(true);
    } catch (err) {
      if (err.status === 401) {
        clearSession();
        setOrderErr('Sua sessão expirou. Volte ao passo 1 e confirme seus dados novamente.');
        setTimeout(() => setStep(1), 2000);
      } else {
        setOrderErr(err.message || 'Não foi possível concluir o pedido. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ——— Resumo do pedido ———
  function CheckoutSummary() {
    return (
      <div className="checkout-summary">
        <p className="summary-label">Resumo do pedido</p>
        {items.map((it) => (
          <div className="summary-row" key={`${it.productId}:${it.size || ''}`}>
            <span>{it.qty}x {it.name} (Tam. {it.size || '—'})</span>
            <span>{brl(it.unitPrice * it.qty)}</span>
          </div>
        ))}
        <div className="summary-row total">
          <span>Total</span>
          <span>{brl(subtotal)}</span>
        </div>
      </div>
    );
  }

  function stepStatus(n) {
    if (n < step) return 'done';
    if (n === step) return 'current';
    return 'pending';
  }

  return (
    <div style={{ paddingTop: 100, display: 'flex', justifyContent: 'center', padding: '100px 24px 60px' }}>
      <div className="modal-content" style={{ width: '100%', maxWidth: 640 }}>
        <div className="checkout-body">

          {/* Steps indicator */}
          <div className="checkout-steps-row" aria-label="Etapas do checkout">
            <StepCircle n={1} status={stepStatus(1)} />
            <div className={`step-line${step > 1 ? ' done' : ''}`} />
            <StepCircle n={2} status={stepStatus(2)} />
            <div className={`step-line${step > 2 ? ' done' : ''}`} />
            <StepCircle n={3} status={stepStatus(3)} />
          </div>

          {/* ——— Sucesso ——— */}
          {success && (
            <div className="checkout-success">
              <span className="iconify" data-icon="mdi:check-circle" style={{ fontSize: 48, color: 'var(--green)' }} />
              <h3>Pedido confirmado!</h3>
              <p>Seu pedido foi recebido e está sendo processado. Em breve entraremos em contato.</p>
              <button onClick={() => router.push('/')} className="btn-primary" style={{ marginTop: 20, justifyContent: 'center' }}>
                Fechar
              </button>
            </div>
          )}

          {/* ——— Step 1: Dados ——— */}
          {!success && step === 1 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 className="checkout-section-title">Seus dados</h3>
                  <p className="checkout-section-sub">Nome, e-mail e telefone para o pedido.</p>
                </div>
                <button onClick={() => router.back()} className="modal-close-btn" aria-label="Fechar">
                  <span className="iconify" data-icon="mdi:close" style={{ fontSize: 15 }} />
                </button>
              </div>
              <div className="checkout-form-grid">
                <input type="text"     placeholder="Nome completo"           className="field-input" autoComplete="name"          value={name}     onChange={(e) => setName(e.target.value)} />
                <input type="email"    placeholder="E-mail"                  className="field-input" autoComplete="email"         value={email}    onChange={(e) => setEmail(e.target.value)} />
                <input type="tel"      placeholder="(00) 00000-0000"         className="field-input" autoComplete="tel"           value={phone}    onChange={(e) => setPhone(maskPhone(e.target.value))} inputMode="numeric" maxLength={15} />
                <input type="text"     placeholder="000.000.000-00"          className="field-input"                              value={cpf}      onChange={(e) => setCpf(maskCpf(e.target.value))} inputMode="numeric" maxLength={14} />
                <input type="password" placeholder="Senha (mín. 8 caracteres)" className="field-input field-full" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
                Usamos seu e-mail e senha para criar ou acessar sua conta Pitch Futebol, permitindo acompanhar este pedido.
              </p>
              {authErr && <div className="error-box">{authErr}</div>}
              <div className="checkout-nav">
                <button onClick={() => router.back()} className="btn-secondary">Cancelar</button>
                <button onClick={() => goToStep(2)} className="btn-primary" disabled={loading}>
                  {loading ? 'Verificando…' : 'Próximo →'}
                </button>
              </div>
            </div>
          )}

          {/* ——— Step 2: Endereço ——— */}
          {!success && step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 className="checkout-section-title">Endereço de entrega</h3>
                  <p className="checkout-section-sub">Informe onde deseja receber seu pedido.</p>
                </div>
              </div>
              <div className="checkout-form-grid">
                <input type="text" placeholder="CEP (00000-000)"   className="field-input" autoComplete="postal-code"    value={cep}    onChange={(e) => setCep(maskCep(e.target.value))} inputMode="numeric" maxLength={9} />
                <input type="text" placeholder="Rua / Avenida"     className="field-input" autoComplete="street-address" value={street} onChange={(e) => setStreet(e.target.value)} />
                <input type="text" placeholder="Número"            className="field-input"                               value={num}    onChange={(e) => setNum(e.target.value)} />
                <input type="text" placeholder="Complemento"       className="field-input" autoComplete="address-line2"  value={comp}   onChange={(e) => setComp(e.target.value)} />
                <input type="text" placeholder="Bairro"            className="field-input"                               value={bairro} onChange={(e) => setBairro(e.target.value)} />
                <input type="text" placeholder="Cidade"            className="field-input" autoComplete="address-level2" value={city}   onChange={(e) => setCity(e.target.value)} />
                <input type="text" placeholder="UF (ex: SP)"       className="field-input" autoComplete="address-level1" value={state}  onChange={(e) => setState(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))} maxLength={2} />
              </div>
              <div className="checkout-nav spaced">
                <button onClick={() => setStep(1)} className="btn-secondary">← Voltar</button>
                <button onClick={() => goToStep(3)} className="btn-primary">Próximo →</button>
              </div>
            </div>
          )}

          {/* ——— Step 3: Pagamento ——— */}
          {!success && step === 3 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 className="checkout-section-title">Forma de pagamento</h3>
                  <p className="checkout-section-sub">Escolha como prefere pagar.</p>
                </div>
              </div>
              <div className="payment-options">
                {[
                  { value: 'pix',    name: 'PIX',    desc: '5% de desconto' },
                  { value: 'boleto', name: 'Boleto', desc: 'À vista' },
                  { value: 'cartao', name: 'Cartão', desc: 'Até 3x s/ juros' },
                ].map((opt) => (
                  <label key={opt.value} className={`payment-option${payment === opt.value ? ' selected' : ''}`}>
                    <input type="radio" name="payment" value={opt.value} checked={payment === opt.value} onChange={() => setPayment(opt.value)} />
                    <div className="pay-name">{opt.name}</div>
                    <div className="pay-desc">{opt.desc}</div>
                  </label>
                ))}
              </div>
              <CheckoutSummary />
              {orderErr && <div className="error-box">{orderErr}</div>}
              <div className="checkout-nav spaced">
                <button onClick={() => setStep(2)} className="btn-secondary">← Voltar</button>
                <button onClick={finishOrder} className="btn-primary" disabled={loading}>
                  <span className="iconify" data-icon="mdi:lock-outline" style={{ fontSize: 15 }} />
                  {loading ? 'Enviando…' : 'Finalizar pedido'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
