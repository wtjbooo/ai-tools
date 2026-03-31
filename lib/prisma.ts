import { PrismaClient } from "@prisma/client";

// 避免在 Next.js 开发环境下由于热重载导致实例化多个 Prisma Client 耗尽数据库连接
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // 在开发环境下打印查询日志，方便调试；生产环境只打印错误
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;