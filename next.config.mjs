/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Disable the client-side Router Cache for dynamic pages so navigating
    // to a page always fetches fresh data from the server instead of serving
    // a 30-second stale cached render.
    staleTimes: {
      dynamic: 0,
    },
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Konva's Node.js build path tries to require 'canvas' (node-canvas).
      // We don't use Konva server-side (PlannerCanvas is dynamically imported
      // with ssr:false), so we alias it to an empty module to prevent the
      // build error. This does NOT affect client-side rendering.
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
};

export default nextConfig;
