/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  transpilePackages: ['@zhao/api', '@zhao/auth', '@zhao/types', '@zhao/utils'],
};

module.exports = nextConfig;
