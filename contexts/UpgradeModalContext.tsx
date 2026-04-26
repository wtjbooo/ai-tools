"use client";

import React, { createContext, useContext, useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";

// 1. 定义遥控器的功能：给 openModal 加上可选参数 isExhausted
interface UpgradeModalContextType {
  isOpen: boolean;
  openModal: (isExhausted?: boolean) => void;
  closeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(undefined);

// 这是一个巨大的包裹器，它会把整个网站包裹起来
export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // 🚀 新增状态：用来记录弹窗到底是因为“没额度了”还是“主动点击”打开的
  const [isExhausted, setIsExhausted] = useState(false); 

  // 🚀 修改打开函数，接收参数并设置状态
  const openModal = (exhausted = false) => {
    setIsExhausted(exhausted);
    setIsOpen(true);
  };

  const closeModal = () => setIsOpen(false);

  return (
    <UpgradeModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
      {/* 🚀 弹窗被挂载在全局最顶层，并把 isExhausted 传递给它！ */}
      <UpgradeModal 
        isOpen={isOpen} 
        onClose={closeModal} 
        isExhausted={isExhausted} 
      />
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