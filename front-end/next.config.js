/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "arweave.net",
        port: "",
        pathname: "**",
      },
    ],
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    // !! NEED TO ADDRESS THESE ISSUES BEFORE MAINNET LAUNCH !!
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
