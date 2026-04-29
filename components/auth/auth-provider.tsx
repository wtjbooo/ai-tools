"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef, // 💡 核心修复 1：引入 useRef
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type AuthUser = {
  id?: string;
  email?: string | null;
  phone?: string | null;
  nickname?: string | null;
  name?: string | null;
  avatar?: string | null;
  image?: string | null;
  isPro?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  setAuthUser: (user: AuthUser | null) => void;
  syncSession: (fallbackUser?: AuthUser | null) => Promise<void>;
  logout: () => Promise<void>;
};

// ----------------------------------------------------------------------
// Constants & Utils
// ----------------------------------------------------------------------

const AUTH_SNAPSHOT_KEY = "ai-tools-auth-user";

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

function onlyDigits(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function maskPhone(phone?: string | null) {
  if (!phone) return "";
  const normalized = onlyDigits(phone);
  if (normalized.length !== 11) return phone;
  return `${normalized.slice(0, 3)}****${normalized.slice(7)}`;
}

function maskEmail(email?: string | null) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;

  if (name.length <= 2) {
    return `${name.slice(0, 1)}***@${domain}`;
  }
  return `${name.slice(0, 2)}***@${domain}`;
}

function getDisplayName(user: AuthUser | null) {
  if (!user) return "";
  return (
    user.nickname?.trim() ||
    user.name?.trim() ||
    maskEmail(user.email) ||
    maskPhone(user.phone) ||
    "已登录"
  );
}

function normalizeUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  
  const rawImage = (record.image || record.avatar) as string | null;

  return {
    id: typeof record.id === "string" ? record.id : undefined,
    email: typeof record.email === "string" ? record.email : null,
    phone: typeof record.phone === "string" ? record.phone : null,
    nickname: (record.nickname || record.name) as string | null,
    name: typeof record.name === "string" ? record.name : null,
    avatar: rawImage, 
    image: rawImage, 
    isPro: Boolean(record.isPro || record.isVip), 
  };
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function pickUserPayload(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if ("user" in record) return record.user;
  if (
    "data" in record &&
    record.data &&
    typeof record.data === "object" &&
    "user" in (record.data as Record<string, unknown>)
  ) {
    return (record.data as Record<string, unknown>).user;
  }
  return null;
}

// ----------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const router = useRouter();

  const persistUser = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    try {
      if (nextUser) {
        window.localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify(nextUser));
      } else {
        window.localStorage.removeItem(AUTH_SNAPSHOT_KEY);
      }
    } catch {
      // ignore localStorage issues
    }
  }, []);

  const syncSession = useCallback(
    async (fallbackUser?: AuthUser | null) => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 404 || response.status === 401 || !response.ok) {
           persistUser(fallbackUser !== undefined ? fallbackUser : null);
           return;
        }

        const data = await readJsonSafely(response);
        const nextUser = normalizeUser(pickUserPayload(data));

        if (nextUser) {
          persistUser(nextUser);
        } else {
           persistUser(fallbackUser !== undefined ? fallbackUser : null);
        }
      } catch {
        if (fallbackUser !== undefined) {
          persistUser(fallbackUser);
        }
      }
    },
    [persistUser],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      persistUser(null);
      router.refresh();
      router.push("/"); // 退出后回到首页
    } catch (error) {
      console.error("Logout failed", error);
    }
  }, [persistUser, router]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      let snapshotUser: AuthUser | null = null;
      try {
        const raw = window.localStorage.getItem(AUTH_SNAPSHOT_KEY);
        if (raw) {
          snapshotUser = normalizeUser(JSON.parse(raw));
          if (!cancelled && snapshotUser) {
            setUser(snapshotUser);
          }
        }
      } catch {}

      await syncSession(snapshotUser);
      if (!cancelled) setIsReady(true);
    }
    void boot();
    return () => { cancelled = true; };
  }, [syncSession]);

  useEffect(() => {
    if (!isReady) return;
    const handleFocus = () => void syncSession();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isReady, syncSession]);

  const openLogin = useCallback(() => {
    if (user) return;
    setIsLoginOpen(true);
  }, [user]);

  const closeLogin = useCallback(() => setIsLoginOpen(false), []);

  const setAuthUser = useCallback(
    (nextUser: AuthUser | null) => persistUser(nextUser),
    [persistUser]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isReady,
      isLoginOpen,
      openLogin,
      closeLogin,
      setAuthUser,
      syncSession,
      logout,
    }),
    [closeLogin, isLoginOpen, isReady, openLogin, setAuthUser, syncSession, user, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal open={isLoginOpen} onClose={closeLogin} />
    </AuthContext.Provider>
  );
}

// ----------------------------------------------------------------------
// AuthButton (Header 右侧占位)
// ----------------------------------------------------------------------

export function AuthButton() {
  const { user, isAuthenticated, isReady, openLogin, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter(); 
  
  // 💡 核心修复 2：创建组件引用，用于判断点击区域
  const menuRef = useRef<HTMLDivElement>(null);

  // 💡 核心修复 3：添加全局点击监听，点击外部时自动关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    // 只有在菜单打开时才监听，优化性能
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!isReady) {
    return (
      <div
        aria-hidden="true"
        className="h-10 w-[80px] shrink-0 rounded-full border border-black/6 bg-white/70 shadow-[0_10px_24px_rgba(15,23,42,0.04)] animate-pulse"
      />
    );
  }

  if (isAuthenticated && user) {
    return (
      // 💡 核心修复 4：将 ref 绑定到最外层容器上
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`group inline-flex h-10 shrink-0 items-center gap-2.5 rounded-full border px-3 sm:px-3.5 text-sm font-medium shadow-sm transition-all focus:outline-none ${
            user.isPro
              ? "border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white hover:border-amber-300 text-amber-950 shadow-amber-500/10"
              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 text-zinc-900"
          }`}
        >
          <div className="relative">
            {user.avatar || user.image ? (
              <img 
                src={(user.avatar || user.image) as string} 
                alt="Avatar" 
                className={`h-6 w-6 rounded-full object-cover border ${user.isPro ? "border-amber-300" : "border-zinc-200"}`} 
              />
            ) : (
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] ml-1" />
            )}
            
            {user.isPro && (
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm ring-1 ring-white">
                <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7.4-6.3-4.8-6.3 4.8 2.3-7.4-6-4.6h7.6z"/>
                </svg>
              </span>
            )}
          </div>
          
          <span className="max-w-[80px] sm:max-w-[100px] truncate">{getDisplayName(user)}</span>
          <svg className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} ${user.isPro ? 'text-amber-500/70' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          // 💡 核心修复 5：移除了原来导致问题的透明 fixed 遮罩层
          <div className="absolute right-0 top-full mt-2 w-52 z-50 overflow-hidden rounded-2xl border border-zinc-100 bg-white p-1.5 shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-3 py-2 border-b border-zinc-50 mb-1">
              <div className="text-[13px] font-medium text-zinc-800 truncate">{getDisplayName(user)}</div>
              <div className="text-[11px] text-zinc-400 truncate mt-0.5">{user.email || '已验证账户'}</div>
            </div>
            
            {user.isPro && (
              <div className="mx-1 mb-1.5 px-3 py-2 bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl border border-amber-100/50 flex items-center justify-between">
                <span className="text-[12px] font-bold text-amber-700">Pro 会员</span>
                <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7.4-6.3-4.8-6.3 4.8 2.3-7.4-6-4.6h7.6z"/></svg>
              </div>
            )}

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                router.push('/dashboard');
              }}
              className="w-full text-left flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
            >
              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              进入专属工作台
            </button>

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                logout();
              }}
              className="w-full text-left flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 mt-1"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              退出登录
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openLogin}
      className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition-all hover:bg-zinc-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
    >
      登录
    </button>
  );
}

// ----------------------------------------------------------------------
// LoginModal (极简邮箱版)
// ----------------------------------------------------------------------

type ModalProps = {
  open: boolean;
  onClose: () => void;
};

function LoginModal({ open, onClose }: ModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const handleEmailLogin = () => {
    onClose();
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/auth/email?redirectTo=${encodeURIComponent(currentPath)}`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-[380px] overflow-hidden rounded-[32px] bg-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] transition-all animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute right-6 top-6 text-zinc-400 transition-colors hover:text-zinc-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mt-2 mb-8">
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">登录账号</h2>
          <p className="mt-2 text-[13px] text-zinc-500">为了您的数据安全，请验证身份</p>
        </div>

        <div className="space-y-3">
          <button onClick={handleEmailLogin} className="group flex w-full items-center justify-between rounded-[24px] border border-zinc-200 bg-white p-4 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-zinc-100 bg-zinc-50 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:bg-indigo-50 group-hover:border-indigo-100">
                <svg className="h-5 w-5 text-zinc-600 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-[15px] font-semibold text-zinc-900">邮箱安全登录</div>
                <div className="mt-0.5 text-[12px] text-zinc-500">使用验证码快速验证身份</div>
              </div>
            </div>
            
            <svg className="h-5 w-5 text-zinc-300 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}