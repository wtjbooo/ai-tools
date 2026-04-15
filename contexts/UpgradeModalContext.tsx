"use client";

import React, { createContext, useContext, useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";

// 定义遥控器的功能：打开弹窗、关闭弹窗
interface UpgradeModalContextType {
  openModal: () => void;
  closeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(undefined);

// 这是一个巨大的包裹器，它会把整个网站包裹起来
export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <UpgradeModalContext.Provider value={{ openModal: () => setIsOpen(true), closeModal: () => setIsOpen(false) }}>
      {children}
      {/* 弹窗被挂载在全局最顶层！ */}
      <UpgradeModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </UpgradeModalContext.Provider>
  );
}

// 这是一个极其方便的钩子（Hook），以后任何组件想要弹窗，调它就行了！
export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (!context) {
    throw new Error("useUpgradeModal 必须在 UpgradeModalProvider 内部使用");
  }
  return context;
}