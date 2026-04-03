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
  return {
    id: typeof record.id === "string" ? record.id : undefined,
    email: typeof record.email === "string" ? record.email : null,
    phone: typeof record.phone === "string" ? record.phone : null,
    nickname: typeof record.nickname === "string" ? record.nickname : null,
    name: typeof record.name === "string" ? record.name : null,
    avatar: typeof record.avatar === "string" ? record.avatar : null,
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
          className="group inline-flex h-10 shrink-0 items-center gap-2.5 rounded-full border border-zinc-200 bg-white px-3 sm:px-3.5 text-sm font-medium text-zinc-900 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none"
        >
          {user.avatar ? (
            <img src={user.avatar} alt="Avatar" className="h-6 w-6 rounded-full object-cover border border-zinc-200" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] ml-1" />
          )}
          <span className="max-w-[80px] sm:max-w-[100px] truncate">{getDisplayName(user)}</span>
          <svg className={`h-4 w-4 text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-48 z-50 overflow-hidden rounded-2xl border border-zinc-100 bg-white p-1.5 shadow-lg ring-1 ring-black/5">
              <div className="px-3 py-2 text-xs text-zinc-500 border-b border-zinc-50 mb-1 truncate">
                {user.email || '已登录用户'}
              </div>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsProfileOpen(true);
                }}
                className="w-full text-left flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                账号设置 & 历史
              </button>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  logout();
                }}
                className="w-full text-left flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
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
      <div className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px] transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-[380px] overflow-hidden rounded-[28px] bg-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] transition-all">
        <button onClick={onClose} className="absolute right-6 top-6 text-zinc-400 transition-colors hover:text-zinc-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mt-2 mb-8">
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">登录你的账号</h2>
          <p className="mt-2 text-sm text-zinc-500">为了您的数据安全，请验证身份</p>
        </div>

        <div className="space-y-3">
          <button onClick={handleEmailLogin} className="group flex w-full items-center justify-between rounded-[20px] border border-black/[0.08] bg-zinc-50/50 p-4 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:border-black/[0.15] hover:bg-white hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-black/[0.04] bg-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                <svg className="h-5 w-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-[15px] font-semibold text-zinc-900">邮箱安全登录</div>
                <div className="mt-0.5 text-[13px] text-zinc-500">使用验证码快速验证身份</div>
              </div>
            </div>
            
            <svg className="h-5 w-5 text-zinc-300 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1 group-hover:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
// ProfileModal (终极三合一版：资料 + 历史 + 收藏)
// ----------------------------------------------------------------------

type TabType = "profile" | "history" | "collections";

function ProfileModal({ open, onClose }: ModalProps) {
  const { user, syncSession } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  // 修改：分段控制器支持 3 个 Tab
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 新增：收藏相关状态
  const [collectionItems, setCollectionItems] = useState<any[]>([]);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && user) {
      setNickname(user.nickname || user.name || "");
      setAvatar(user.avatar || "");
      setActiveTab("profile"); 
    }
  }, [open, user]);

  // 监听 Tab 切换，按需加载数据
  useEffect(() => {
    if (!open) return;

    if (activeTab === "history") {
      setIsLoadingHistory(true);
      fetch("/api/user/history")
        .then((res) => res.json())
        .then((data) => {
          // 适配 data.tasks 或 data.data
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
        body: JSON.stringify({ nickname, avatar }),
      });
      if (res.ok) { await syncSession(); onClose(); } 
      else { alert("保存失败"); }
    } catch (error) { alert("网络错误"); } 
    finally { setIsLoading(false); }
  };

  if (!mounted || !open || !user) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px] transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-[32px] bg-white p-6 sm:p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] transition-all">
        <button onClick={onClose} className="absolute right-5 top-5 sm:right-6 sm:top-6 text-zinc-400 transition-colors hover:text-zinc-900 z-10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 顶部 Tab 分段控制器 (升级为 3 个) */}
        <div className="flex bg-zinc-100/80 p-1 rounded-2xl mb-6 mt-2 relative">
          {(["profile", "history", "collections"] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 py-2 text-[12px] font-semibold rounded-[12px] transition-all z-10 ${activeTab === tab ? "text-zinc-900 shadow-sm bg-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {tab === "profile" ? "资料" : tab === "history" ? "历史" : "收藏夹"}
            </button>
          ))}
        </div>

        {/* --- 面板 1：个人资料 --- */}
        {activeTab === "profile" && (
          <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col items-center justify-center pt-2">
              <div onClick={() => fileInputRef.current?.click()} className="relative h-[88px] w-[88px] cursor-pointer group rounded-full overflow-hidden shadow-sm border border-zinc-200 bg-zinc-100 flex items-center justify-center transition-all hover:ring-4 hover:ring-zinc-100">
                {avatar ? <img src={avatar} alt="预览" className="h-full w-full object-cover" /> : <span className="text-zinc-400 text-3xl font-medium">{nickname ? nickname.charAt(0).toUpperCase() : "?"}</span>}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-zinc-400 font-medium">点击修改头像</p>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5 ml-1">昵称</label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900" required />
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-zinc-900 text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-all active:scale-[0.98]">
              {isLoading ? "保存中..." : "保存修改"}
            </button>
          </form>
        )}

        {/* --- 面板 2：生成历史 --- */}
        {activeTab === "history" && (
          <div className="min-h-[300px] max-h-[380px] overflow-y-auto pr-1 -mr-2 animate-in fade-in slide-in-from-bottom-2 duration-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {isLoadingHistory ? <div className="flex flex-col items-center justify-center h-[260px] text-zinc-400 text-[13px]"><div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-3" />加载中...</div> : 
             historyItems.length === 0 ? <div className="flex flex-col items-center justify-center h-[260px] text-zinc-400 text-[13px] italic">暂无生成历史</div> : (
              <div className="space-y-2.5 pb-4">
                {historyItems.map((item) => (
                  <Link key={item.id} href={`/reverse-prompt?task=${item.id}`} onClick={onClose} className="group block border border-zinc-100 bg-zinc-50/50 p-4 rounded-2xl hover:bg-white hover:border-zinc-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-zinc-200/50 text-zinc-500 text-[10px] font-medium rounded-md uppercase tracking-wide">{item.targetPlatform || "通用"}</span>
                      <span className="text-zinc-400 text-[11px]">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between"><p className="text-[13px] text-zinc-700 font-medium">{item.status === "completed" ? "✅ 生成成功" : "⏳ 处理中"}</p><svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth={2} /></svg></div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- 面板 3：我的收藏 --- */}
        {activeTab === "collections" && (
          <div className="min-h-[300px] max-h-[380px] overflow-y-auto pr-1 -mr-2 animate-in fade-in slide-in-from-bottom-2 duration-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {isLoadingCollection ? <div className="flex flex-col items-center justify-center h-[260px] text-zinc-400 text-[13px]"><div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-3" />加载中...</div> : 
             collectionItems.length === 0 ? <div className="flex flex-col items-center justify-center h-[260px] text-zinc-400 text-[13px] italic">收藏夹空空如也</div> : (
              <div className="space-y-2.5 pb-4">
                {collectionItems.map((item) => (
                  <a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="group block border border-zinc-100 bg-zinc-50/50 p-4 rounded-2xl hover:bg-white hover:border-zinc-200 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md uppercase tracking-wide">{item.platform}</span>
                      <svg className="w-3.5 h-3.5 text-zinc-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </div>
                    <h4 className="text-[14px] font-semibold text-zinc-800 line-clamp-1">{item.title}</h4>
                    {item.description && <p className="text-[12px] text-zinc-500 line-clamp-2 mt-1 leading-relaxed">{item.description}</p>}
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