/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Backend em produção (Render) — serve /uploads e /seed-images.
      // Troque 'pitch-futebol-api' pelo nome real do seu serviço no Render
      // se escolher um nome diferente ao criar o Web Service.
      {
        protocol: 'https',
        hostname: 'pitch-futebol-api.onrender.com',
      },
      // Backend antigo (Railway) — mantido até a migração terminar.
      // Pode remover depois que confirmar que tudo funciona no Render.
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
