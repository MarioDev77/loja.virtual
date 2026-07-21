import Script from "next/script";
import Providers from "@/context/Providers";
import "./globals.css";

export const metadata = {
  title: "Pitch Futebol — Chuteiras & Moda",
  description: "Loja especializada em chuteiras Society, Futsal e Campo.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Script src="https://code.iconify.design/3/3.1.0/iconify.min.js" strategy="afterInteractive" />
        <div id="toastContainer" aria-live="polite" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
