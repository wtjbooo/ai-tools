"use client";

import { useEffect, useRef } from "react";

type ToolViewTrackerProps = {
  slug: string;
};

export default function ToolViewTracker({
  slug,
}: ToolViewTrackerProps) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!slug || hasTrackedRef.current) return;

    hasTrackedRef.current = true;

    fetch("/api/track/view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug }),
      cache: "no-store",
    }).catch((error) => {
      console.error("track view request failed:", error);
    });
  }, [slug]);

  return null;
}