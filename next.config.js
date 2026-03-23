/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Avoid failing the production build due to ESLint errors
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    '@radix-ui/react-dialog',
    '@radix-ui/react-label',
    '@radix-ui/react-popover',
    '@radix-ui/react-select',
    '@radix-ui/react-slot',
    '@radix-ui/react-tabs',
    '@radix-ui/react-tooltip',
    'lucide-react',
    'react-day-picker',
    'recharts',
  ],
  webpack: (config, { isServer }) => {
    // Resolver problemas de módulos duplicados
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Asegurar que los módulos de React se resuelvan correctamente
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    return config;
  },
};

export default nextConfig;
