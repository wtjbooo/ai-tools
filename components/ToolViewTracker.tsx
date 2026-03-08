"use client";

import { useEffect } from "react";

export default function ToolViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;

    const key = `viewed_tool_${slug}`;
    const viewed = sessionStorage.getItem(key);

    if (viewed) return;

    sessionStorage.setItem(key, "1");

    fetch("/api/tool/view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  return null;
}