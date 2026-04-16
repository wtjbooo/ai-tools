// components/SiteShell.tsx
"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface SiteShellProps {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

export default function SiteShell({ header, footer, children }: SiteShellProps) {
  const pathname = usePathname();
  
  // 判断当前是否在工作台路径下 (/dashboard 开头的路径)
  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <>
      {/* 如果不是工作台，才显示顶栏 */}
      {!isDashboard && header}
      
      <main>{children}</main>
      
      {/* 如果不是工作台，才显示底栏 */}
      {!isDashboard && footer}
    </>
  );
}