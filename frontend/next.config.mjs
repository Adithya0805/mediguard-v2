/** @type {import('next').NextConfig} */
let rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
if (rawApiUrl && !rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) {
  rawApiUrl = `https://${rawApiUrl}`;
}

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['mock-storage.supabase.co', 'supabase.co'],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${rawApiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
