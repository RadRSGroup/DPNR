import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  trailingSlash: true,
  distDir: 'out',

  // Image optimization
  images: {
    unoptimized: process.env.NODE_ENV === 'production' && process.env.BUILD_EXPORT === 'true',
    domains: ['be-dpnr.com', 'api.be-dpnr.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Experimental optimizations
  experimental: {
    optimizePackageImports: [
      '@heroicons/react',
      'lucide-react',
      'framer-motion',
      '@aws-amplify/auth',
      '@supabase/supabase-js'
    ],
    optimizeCss: true,
    swcMinify: true,
  },

  // Build configuration
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disable ESLint for deployment preparation
  },
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checking enabled
  },

  // Security and performance
  poweredByHeader: false,
  reactStrictMode: true, // Enable strict mode for production
  swcMinify: true,
  compress: true,

  // Build ID for cache busting
  generateBuildId: async () => {
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      return process.env.VERCEL_GIT_COMMIT_SHA;
    }
    if (process.env.NODE_ENV === 'production') {
      return `be-dpnr-prod-${Date.now()}`;
    }
    return 'be-dpnr-dev-build';
  },

  // Custom headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Webpack customization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Bundle analyzer in production
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }

      // Split chunks for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }

    // RTL and fallback configuration
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

export default withNextIntl(nextConfig);
