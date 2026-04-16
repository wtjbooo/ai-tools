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
  useRef,
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`group inline-flex h-10 shrink-0 items-center gap-2.5 rounded-full border px-3 sm:px-3.5 text-sm font-medium shadow-sm transition-all focus:outline-none ${
            user.isPro
              ? "border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white hover:border-amber-300 text-amber-950 shadow-amber-500/10"
              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 text-zinc-900"
          }`}
        >
          <div className="relative">
            {user.avatar ? (
              <img 
                src={user.avatar} 
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
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
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
                  setIsProfileOpen(true);
                }}
                className="w-full text-left flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                账号设置 & 历史
              </button>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  logout();
                }}
                className="w-full text-left flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                退出登录
              </button>
            </div>
          </>
        )}

        <ProfileModal open={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
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

// ----------------------------------------------------------------------
// ProfileModal (AI 视效版升级！)
// ----------------------------------------------------------------------

type TabType = "profile" | "history" | "collections";

function ProfileModal({ open, onClose }: ModalProps) {
  const { user, syncSession } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [collectionItems, setCollectionItems] = useState<any[]>([]);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setNickname(user?.nickname || user?.name || "");
      setAvatar(user?.avatar || "");
      setActiveTab("profile"); 
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;

    if (activeTab === "history") {
      setIsLoadingHistory(true);
      fetch("/api/user/history")
        .then((res) => res.json())
        .then((data) => {
          setHistoryItems(data.tasks || data.data || []);
        })
        .catch((err) => console.error("加载历史失败", err))
        .finally(() => setIsLoadingHistory(false));
    }

    if (activeTab === "collections") {
      setIsLoadingCollection(true);
      fetch("/api/user/collection")
        .then((res) => res.json())
        .then((data) => {
          setCollectionItems(data.data || []);
        })
        .catch((err) => console.error("加载收藏失败", err))
        .finally(() => setIsLoadingCollection(false));
    }
  }, [activeTab, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("图片太大啦，请选择 5MB 以下的图片。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        const dataUrl = canvas.toDataURL("image/webp", 0.8);
        setAvatar(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nickname, image: avatar }),
      });
      
      if (res.ok) { 
        await syncSession(); 
        onClose(); 
      } else { 
        const errorMsg = await res.text();
        alert(`保存失败，请检查详情: ${errorMsg.slice(0, 50)}`); 
      }
    } catch (error) { 
      alert("网络错误，请检查连接"); 
    } finally { 
      setIsLoading(false); 
    }
  };

  if (!mounted || !open || !user) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[4px] transition-opacity" onClick={onClose} />
      
      {/* ✨ 弹窗背后的微光环境 ✨ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-cyan-400/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[6000ms]" />

      <div className="relative w-full max-w-[440px] overflow-hidden rounded-[32px] bg-white/90 backdrop-blur-xl border border-white p-6 sm:p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] transition-all animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute right-5 top-5 sm:right-6 sm:top-6 text-zinc-400 transition-colors hover:text-zinc-900 z-10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* ✨ 高级感的毛玻璃导航栏 ✨ */}
        <div className="flex bg-zinc-100/50 p-1.5 rounded-[20px] mb-6 mt-2 relative border border-zinc-200/50 backdrop-blur-md shadow-inner">
          {(["profile", "history", "collections"] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 py-2.5 text-[13px] font-semibold rounded-[14px] transition-all duration-300 z-10 ${
                activeTab === tab 
                  ? "text-zinc-900 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-black/[0.04] scale-100" 
                  : "text-zinc-400 hover:text-zinc-700 hover:bg-white/40 scale-95"
              }`}
            >
              {tab === "profile" ? "基础资料" : tab === "history" ? "生成记录" : "灵感收藏"}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col items-center justify-center pt-2">
              <div onClick={() => fileInputRef.current?.click()} className="relative h-[96px] w-[96px] cursor-pointer group rounded-full overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-2 border-white bg-zinc-100 flex items-center justify-center transition-all hover:scale-105">
                {avatar ? <img src={avatar} alt="预览" className="h-full w-full object-cover" /> : <span className="text-zinc-400 text-3xl font-medium">{nickname ? nickname.charAt(0).toUpperCase() : "?"}</span>}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </div>
              <p className="mt-4 text-[12px] text-indigo-500 font-medium bg-indigo-50 px-3 py-1 rounded-full cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => fileInputRef.current?.click()}>更换专属头像</p>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-zinc-700 mb-2 ml-1">AI 实验室代号 (昵称)</label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-200/80 rounded-[18px] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all shadow-inner" required />
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-[18px] text-[14px] font-semibold hover:shadow-[0_8px_20px_rgba(24,24,27,0.2)] disabled:opacity-50 transition-all active:scale-[0.98]">
              {isLoading ? "同步数据中..." : "保存资料档案"}
            </button>
          </form>
        )}

        {activeTab === "history" && (
          <div className="min-h-[300px] max-h-[380px] overflow-y-auto pr-1 -mr-2 animate-in fade-in slide-in-from-bottom-2 duration-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {isLoadingHistory ? (
               <div className="flex flex-col items-center justify-center h-[260px] text-indigo-400 text-[13px]"><div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-3" />调用数据库中...</div> 
            ) : historyItems.length === 0 ? (
               // ✨ 升级版全息呼吸空状态 (历史) ✨
               <div className="flex flex-col items-center justify-center h-[260px] relative overflow-hidden rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/50">
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 blur-xl pointer-events-none" />
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-center mb-4 relative">
                    <svg className="w-7 h-7 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  </div>
                  <p className="text-[14px] font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">记忆区空空如也</p>
                  <p className="text-[12px] text-zinc-400 mt-1.5 font-medium">去使用 AI 工具，留下第一串代码印记吧</p>
               </div>
            ) : (
              <div className="space-y-3 pb-4">
                {historyItems.map((item) => (
                  // ✨ 升级版神经元列表卡片 (历史) ✨
                  <Link key={item.id} href={`/reverse-prompt?task=${item.id}`} onClick={onClose} className="group relative block overflow-hidden rounded-[20px] bg-white p-4 border border-zinc-100 shadow-sm hover:border-indigo-200 hover:shadow-[0_8px_24px_rgba(99,102,241,0.08)] transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-purple-500/0 to-cyan-500/0 group-hover:from-indigo-500/5 group-hover:via-purple-500/5 group-hover:to-cyan-500/5 transition-all duration-500 pointer-events-none" />
                    <div className="relative flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                         <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                         {item.targetPlatform || "通用引擎"}
                      </span>
                      <span className="text-zinc-400 text-[11px] font-medium font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="relative flex items-center justify-between">
                      <p className={`text-[13px] font-semibold flex items-center gap-2 ${item.status === "completed" ? "text-emerald-600" : "text-amber-600"}`}>
                        {item.status === "completed" ? (
                           <><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> 推理完成</>
                        ) : (
                           <><span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span> 引擎处理中</>
                        )}
                      </p>
                      <svg className="w-4 h-4 text-zinc-300 group-hover:text-indigo-500 transition-colors group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth={2} /></svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "collections" && (
          <div className="min-h-[300px] max-h-[380px] overflow-y-auto pr-1 -mr-2 animate-in fade-in slide-in-from-bottom-2 duration-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {isLoadingCollection ? (
               <div className="flex flex-col items-center justify-center h-[260px] text-cyan-400 text-[13px]"><div className="w-6 h-6 border-2 border-cyan-100 border-t-cyan-500 rounded-full animate-spin mb-3" />同步灵感库中...</div>
            ) : collectionItems.length === 0 ? (
               // ✨ 升级版全息呼吸空状态 (收藏) ✨
               <div className="flex flex-col items-center justify-center h-[260px] relative overflow-hidden rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/50">
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-blue-500/5 blur-xl pointer-events-none" />
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-center mb-4 relative">
                    <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                  </div>
                  <p className="text-[14px] font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-500">灵感库尚未激活</p>
                  <p className="text-[12px] text-zinc-400 mt-1.5 font-medium">遇到喜欢的 AI 神器，记得点击收藏哦</p>
               </div>
            ) : (
              <div className="space-y-3 pb-4">
                {collectionItems.map((item) => (
                  // ✨ 升级版神经元列表卡片 (收藏) ✨
                  <a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-[20px] bg-white p-4 border border-zinc-100 shadow-sm hover:border-cyan-200 hover:shadow-[0_8px_24px_rgba(6,182,212,0.08)] transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-indigo-500/0 group-hover:from-cyan-500/5 group-hover:via-blue-500/5 group-hover:to-indigo-500/5 transition-all duration-500 pointer-events-none" />
                    <div className="relative flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm border border-cyan-100/50">{item.platform}</span>
                      <div className="w-6 h-6 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white text-zinc-400 transition-colors">
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </div>
                    </div>
                    <h4 className="relative text-[15px] font-bold text-zinc-800 line-clamp-1 group-hover:text-cyan-700 transition-colors">{item.title}</h4>
                    {item.description && <p className="relative text-[12px] text-zinc-500 line-clamp-2 mt-1.5 leading-relaxed font-medium">{item.description}</p>}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}