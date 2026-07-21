import Providers from "@/context/Providers";
import "./globals.css";

export const metadata = {
  title: "AG12 Sports — Chuteiras & Moda",
  description: "AG12 Sports: chuteiras Society, Futsal e Campo.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <div id="toastContainer" aria-live="polite" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
