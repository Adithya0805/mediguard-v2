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
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400
  },
  compress: true,
  poweredByHeader: false
};

export default nextConfig;
