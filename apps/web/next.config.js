/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dcc-staking/sdk', '@dcc-staking/config'],
};

module.exports = nextConfig;
