import { ProxyAgent, setGlobalDispatcher } from 'undici';

// 仅在本地开发环境下生效，避免影响 Vercel 线上环境
if (process.env.NODE_ENV === 'development') {
  // 请将 7890 替换为你实际 VPN 软件的本地端口（Clash 默认 7890，v2ray 默认 10808）
  const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
  
  try {
    const dispatcher = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(dispatcher);
    console.log(`[开发环境] 全局网络代理已开启: ${proxyUrl}`);
  } catch (error) {
    console.error('设置全局代理失败:', error);
  }
}