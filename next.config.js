/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // 1. 优化你原有的规则：把旧的 vercel 域名直接跳到你的新主域名
      {
        source: "/:path*",
        has: [{ type: "host", value: "ai-toolssr.vercel.app" }],
        destination: "https://xaira.top/:path*", // 顺手帮你把目标地址改成了最新的专属域名！
        permanent: true, // 301 永久重定向
      },
      // 2. ✨ 新增的规则：把 www.xaira.top 自动跳转到 xaira.top
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.xaira.top" }],
        destination: "https://xaira.top/:path*",
        permanent: true, // 301 永久重定向
      },
    ];
  },
};

module.exports = nextConfig;