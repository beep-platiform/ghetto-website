/** @type {import('next').NextConfig} */
const nextConfig = {
  // The page wires up its interactions once on mount; strict mode would run that effect twice in dev.
  reactStrictMode: false,
};

export default nextConfig;
