import type { NextConfig } from "next";

// Environment-aware security headers
const isDevelopment = process.env.NODE_ENV === 'development';

const getSecurityHeaders = () => {
  const baseHeaders = [
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'on'
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block'
    },
    {
      key: 'X-Frame-Options',
      value: 'SAMEORIGIN'
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff'
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin'
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()'
    }
  ];

  // Add HSTS only in production
  if (!isDevelopment) {
    baseHeaders.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains'
    });
  }

  // Environment-specific CSP
  const cspPolicy = isDevelopment 
    ? `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' data: https://fonts.gstatic.com;
      img-src 'self' data: https: blob:;
      connect-src 'self' https://accounts.google.com https://apis.google.com ws: wss:;
      frame-src 'self' https://accounts.google.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'self';
    `
    : `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' data: https://fonts.gstatic.com;
      img-src 'self' data: https://cdn.jsdelivr.net https: blob:;
      connect-src 'self' https://accounts.google.com https://apis.google.com ws: wss:;
      frame-src 'self' https://accounts.google.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'self';
      upgrade-insecure-requests;
    `;

  baseHeaders.push({
    key: 'Content-Security-Policy',
    value: cspPolicy.replace(/\s{2,}/g, ' ').trim()
  });

  return baseHeaders;
};

const securityHeaders = getSecurityHeaders();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Special headers for API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0'
          }
        ]
      }
    ]
  },
  poweredByHeader: false,
  reactStrictMode: true,
  // Temporarily disable TypeScript checks for build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Development optimizations
  ...(isDevelopment && {
    webpack: (config: any) => {
      // Enable source maps in development
      config.devtool = 'eval-source-map';
      return config;
    }
  })
};

export default nextConfig;
