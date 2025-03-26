/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Configure worker-loader
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      loader: 'worker-loader',
      options: {
        filename: 'static/[hash].worker.js',
        publicPath: '/_next/',
      },
    });

    return config;
  },
}

module.exports = nextConfig 