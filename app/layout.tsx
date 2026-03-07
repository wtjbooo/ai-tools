import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AI 工具目录",
    template: "%s | AI 工具目录",
  },
  description: "收录实用 AI 工具，支持分类浏览、搜索和投稿提交。",
  metadataBase: new URL("https://y78bq.dpdns.org"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}