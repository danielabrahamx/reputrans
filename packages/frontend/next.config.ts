import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prevent Next.js/Turbopack from bundling native WASM and ESM-only packages.
  // These are only used in server-side API routes and will be loaded by Node.js at runtime.
  serverExternalPackages: [
    '@aztec/bb.js',
    '@noir-lang/backend_barretenberg',
    '@noir-lang/noir_js',
    '@noble/hashes',
    '@noble/curves',
    'poseidon-lite',
  ],
};

export default nextConfig;
