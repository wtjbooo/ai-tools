// components/UpgradeProButton.tsx
"use client";

import { useUpgradeModal } from "@/contexts/UpgradeModalContext";

export default function UpgradeProButton() {
  const { openModal } = useUpgradeModal();

  return (
    <button
      onClick={() => openModal()}
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] active:scale-95"
    >
      <span className="text-[13px] sm:text-[14px]">💎</span>
      升级 Pro
    </button>
  );
}