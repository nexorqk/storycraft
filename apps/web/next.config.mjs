/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@storycraft/shared'],
  output: 'standalone',
};

export default nextConfig;
