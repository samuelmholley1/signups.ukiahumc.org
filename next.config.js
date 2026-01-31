/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  async redirects() {
    return [
      // Liturgists typos
      { source: '/lirugsts', destination: '/liturgists', permanent: true },
      { source: '/liturgist', destination: '/liturgists', permanent: true },
      { source: '/litugists', destination: '/liturgists', permanent: true },
      { source: '/liturgits', destination: '/liturgists', permanent: true },
      { source: '/litrugists', destination: '/liturgists', permanent: true },
      { source: '/liturgsits', destination: '/liturgists', permanent: true },
      { source: '/liturgests', destination: '/liturgists', permanent: true },
      { source: '/litergists', destination: '/liturgists', permanent: true },
      // Greeters typos
      { source: '/greeter', destination: '/greeters', permanent: true },
      { source: '/greetrs', destination: '/greeters', permanent: true },
      { source: '/greters', destination: '/greeters', permanent: true },
      { source: '/greetors', destination: '/greeters', permanent: true },
      { source: '/greetrrs', destination: '/greeters', permanent: true },
      { source: '/gretters', destination: '/greeters', permanent: true },
      // Food distribution typos
      { source: '/food', destination: '/food-distribution', permanent: true },
      { source: '/fooddistribution', destination: '/food-distribution', permanent: true },
      { source: '/food-dist', destination: '/food-distribution', permanent: true },
      { source: '/fooddist', destination: '/food-distribution', permanent: true },
      { source: '/food-distribtion', destination: '/food-distribution', permanent: true },
      { source: '/food-distrubution', destination: '/food-distribution', permanent: true },
      { source: '/food-distibution', destination: '/food-distribution', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/site.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig