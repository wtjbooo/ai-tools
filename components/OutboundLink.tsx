"use client";

import Link from "next/link";
import type { ReactNode, MouseEvent } from "react";

type OutboundLinkProps = {
  slug: string;
  href: string;
  children: ReactNode;
  className?: string;
  target?: "_blank" | "_self";
  rel?: string;
};

export default function OutboundLink({
  slug,
  href,
  children,
  className,
  target = "_blank",
  rel = "noopener noreferrer nofollow",
}: OutboundLinkProps) {
  const handleClick = (_event: MouseEvent<HTMLAnchorElement>) => {
    fetch("/api/track/outclick", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug,
        targetUrl: href,
      }),
      keepalive: true,
    }).catch((error) => {
      console.error("track outclick request failed:", error);
    });
  };

  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}