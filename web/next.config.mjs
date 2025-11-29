/** @type {import('next').NextConfig} */
const nextConfig = {
  // config options here
  async headers() {
    return [
      {
        source: '/softball-hero.jpg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;




