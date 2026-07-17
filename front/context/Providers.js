'use client';

import { AuthProvider } from '@/context/AuthContext';
import { WishProvider } from '@/context/WishContext';
import { ToastProvider } from '@/context/ToastContext';

/**
 * Providers — agrupa todo o estado global client-side em um só lugar.
 * Mantido separado de app/layout.js porque layout.js é Server Component
 * por padrão no App Router, e os contexts (useState/useContext) exigem
 * 'use client'.
 */
export default function Providers({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <WishProvider>{children}</WishProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
