/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  transpilePackages: ['@zhao/api', '@zhao/auth', '@zhao/types', '@zhao/utils'],
};

module.exports = nextConfig;
