/** @type {import('next').NextConfig} */
const nextConfig = {
  // O Next.js não precisa gerar o AGENTS.md automaticamente
  agentRules: false,
  // A API vive no próprio projeto: as chamadas /api/* são atendidas
  // pelas Route Handlers em app/api/*/route.js (sem proxy, sem CORS).
};

export default nextConfig;
