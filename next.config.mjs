/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['pdf-parse'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // pptxgenjs uses node:fs/node:https - must be excluded from client bundle
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'pptxgenjs',
      ]
    }
    return config
  },
}

export default nextConfig
