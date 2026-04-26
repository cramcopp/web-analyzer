import type {NextConfig} from 'next';
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: any = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Removed standalone output as it's not compatible with next-on-pages
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.google.com https://*.googleapis.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://*.googleusercontent.com https://picsum.photos; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com wss://*.firebaseio.com https://*.firebase.com; frame-src https://*.google.com; object-src 'none';",
          },
        ],
      },
    ];
  },
  transpilePackages: ['motion'],
  turbopack: {},
  webpack: (config: any, {dev}: any) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
