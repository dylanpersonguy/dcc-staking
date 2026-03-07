/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dcc-staking/sdk', '@dcc-staking/config'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:${process.env.INDEXER_PORT || '3002'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
