import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server secrets are not inlined here: on Cloudflare Workers the OpenNext
  // adapter copies the Worker's variables and secrets into process.env at runtime.
  env: {
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sgp.cloud.appwrite.io',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // node-appwrite's fetch dependency (node-fetch-native-with-agent) ships a
      // `workerd` build that uses the runtime's native fetch. With Node conditions
      // it pulls in undici, which compiles WebAssembly at runtime; Cloudflare
      // Workers forbid that. Resolve node-appwrite's imports like workerd does.
      config.module.rules.push({
        test: /[\\/]node_modules[\\/]node-appwrite[\\/]/,
        resolve: { conditionNames: ['workerd', 'worker', 'import', 'module', 'default'] },
      });
    }
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
      path: false,
      stream: false,
      crypto: false,
      os: false,
      buffer: false,
      util: false,
      events: false,
      zlib: false,
      http: false,
      https: false,
    };
    return config;
  },
};

export default nextConfig;
