const securityHeaders = [
  // HTTP Strict Transport Security (HSTS): Enforce HTTPS & protect against protocol downgrade
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Clickjacking mitigation: Prevent unauthorized framing
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // MIME-sniffing prevention
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Sensitive URL path leakage prevention
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Hardware and feature restriction
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // DNS prefetch control
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Content Security Policy (CSP)
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://cdn.protect.clerk.com https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://*.convex.cloud wss://*.convex.cloud https://*.convex.site http://localhost:5678",
      "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // OWASP A05: Disable server fingerprinting (suppresses X-Powered-By: Next.js)
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

