/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // The invoice PDF route reads these font files from disk at runtime
  // (see lib/invoice-pdf.tsx) — this makes sure Vercel's serverless
  // bundler always includes them, even if its automatic fs-call tracing
  // misses the path.join(...) pattern.
  outputFileTracingIncludes: {
    '/api/invoices/generate': ['./lib/fonts/**'],
  },
};

module.exports = nextConfig;
