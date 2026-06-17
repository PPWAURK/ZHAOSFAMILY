// Base path for static hosting under a sub-path (e.g. a GitHub Pages project
// site "/REPO"). Leave NEXT_PUBLIC_BASE_PATH empty for a custom domain at root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  transpilePackages: ['@zhao/api', '@zhao/auth', '@zhao/types', '@zhao/utils'],
};

module.exports = nextConfig;
