/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // 把所有 vercel.app 访问都跳到你的自定义域名
      {
        source: "/:path*",
        has: [{ type: "host", value: "ai-toolssr.vercel.app" }],
        destination: "https://ai.y78bq.dpdns.org/:path*",
        permanent: true, // 301
      },
    ];
  },
};

module.exports = nextConfig;