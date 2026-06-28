'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ToastContext — réplica de showToast() no app.js original. Usa o mesmo
 * #toastContainer já presente em app/layout.js (criado via <div> estático),
 * mas renderiza os toasts via portal React em vez de innerHTML manual.
 */
const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [containerEl, setContainerEl] = useState(null);

  useEffect(() => {
    setContainerEl(document.getElementById('toastContainer'));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {containerEl &&
        createPortal(
          toasts.map((t) => (
            <div className={`toast ${t.type}`} key={t.id}>
              <span
                className="iconify text-lg flex-shrink-0"
                data-icon={
                  t.type === 'success' ? 'mdi:check-circle' : t.type === 'error' ? 'mdi:alert-circle' : 'mdi:information'
                }
              />
              <span>{t.message}</span>
            </div>
          )),
          containerEl
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx === null) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}
