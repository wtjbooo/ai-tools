import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 初始化 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 1. 创建上传接口的限流器：普通用户每 1 分钟最多获取 10 次预签名链接
export const uploadRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true, // 开启分析，你可以在 Upstash 后台看图表
  // prefix: "@upstash/ratelimit/upload" // 可选，用于区分不同业务的限流
});

// 2. 创建核心 AI 解析接口的限流器：普通用户每 1 分钟最多请求 5 次
export const analyzeRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
});