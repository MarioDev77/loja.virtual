/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Backend em produção (Railway) — serve /uploads e /seed-images
      {
        protocol: 'https',
        hostname: 'lojavirtual-production-2708.up.railway.app',
      },
      // Backend local em desenvolvimento
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
  },
};

export default nextConfig;
