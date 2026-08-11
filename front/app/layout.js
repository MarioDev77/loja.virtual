import Script from "next/script";
import Providers from "@/context/Providers";
import "./globals.css";

export const metadata = {
  title: "AG12 Sports — Chuteiras & Moda",
  description: "Loja especializada em chuteiras Society, Futsal e Campo.",
};

// Bloqueia o pinch-zoom nativo do navegador na página inteira — o zoom das
// fotos (galeria do produto e ofertas da home) é implementado manualmente
// em JS e continua funcionando normalmente, independente disso.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js" strategy="beforeInteractive" />
        <div id="toastContainer" aria-live="polite" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
