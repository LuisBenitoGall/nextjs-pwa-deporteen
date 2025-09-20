/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 15 expects an object here
    serverActions: {}
  },
  eslint: {
    // Avoid failing the production build due to ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
