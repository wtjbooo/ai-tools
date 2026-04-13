import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 初始化 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 1. 上传接口的限流器：普通用户每 1 分钟最多获取 10 次预签名链接
export const uploadRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
});

// 2. 核心 AI 解析接口的限流器：普通用户每 1 分钟最多请求 5 次
export const analyzeRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
});

// 🚀 3. 新增：魔法扩写接口的专属限流器
export const enhanceRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), 
  analytics: true,
});

// 🚀 4. 新增：全网搜索接口的专属限流器
// 搜索操作可能会消耗第三方搜索 API 额度，建议限制为每分钟 5 次
export const searchRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), 
  analytics: true,
});