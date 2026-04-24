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
};

export default nextConfig;
