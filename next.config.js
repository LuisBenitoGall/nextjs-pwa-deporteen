/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
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
