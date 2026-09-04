/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Conteúdo é privado: nunca deve ser indexado nem embutido em outros sites.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, noimageindex' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(self)' },
        ],
      },
    ]
  },
  images: {
    // As mídias vêm de signed URLs do Supabase Storage.
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
}

export default nextConfig
