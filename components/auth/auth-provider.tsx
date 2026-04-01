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
                账号设置
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

        {/* 渲染个人设置弹窗 */}
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
// LoginModal
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
      
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] bg-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] transition-all">
        <button onClick={onClose} className="absolute right-6 top-6 text-zinc-400 transition-colors hover:text-zinc-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mt-2 mb-8">
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">登录你的账号</h2>
          <p className="mt-2 text-sm text-zinc-500">选择一种方式继续</p>
        </div>

        <div className="space-y-3">
          <button onClick={handleEmailLogin} className="group flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-900 hover:bg-zinc-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 transition-colors group-hover:bg-white">
                <svg className="h-5 w-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-zinc-900">邮箱登录</div>
                <div className="text-xs text-zinc-500">安全且便捷的验证方式</div>
              </div>
            </div>
          </button>

          <button disabled className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-4 opacity-70">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100/80">
                <svg className="h-5 w-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.5,13.5 C7.67,13.5 7,12.83 7,12 C7,11.17 7.67,10.5 8.5,10.5 C9.33,10.5 10,11.17 10,12 C10,12.83 9.33,13.5 8.5,13.5 Z M15.5,13.5 C14.67,13.5 14,12.83 14,12 C14,11.17 14.67,10.5 15.5,10.5 C16.33,10.5 17,11.17 17,12 C17,12.83 16.33,13.5 15.5,13.5 Z M12,3 C6.48,3 2,6.84 2,11.5 C2,14.16 3.42,16.51 5.61,17.93 L4.72,20.57 L7.72,19.09 C9.05,19.67 10.49,20 12,20 C17.52,20 22,16.16 22,11.5 C22,6.84 17.52,3 12,3 Z"/>
                </svg>
              </div>
              <div className="text-left"><div className="text-sm font-medium text-zinc-400">微信登录</div></div>
            </div>
            <div className="rounded-md bg-zinc-200/50 px-2 py-1 text-[11px] font-medium text-zinc-500">即将开放</div>
          </button>

          <button disabled className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-4 opacity-70">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100/80">
                <svg className="h-5 w-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
              <div className="text-left"><div className="text-sm font-medium text-zinc-400">QQ 登录</div></div>
            </div>
            <div className="rounded-md bg-zinc-200/50 px-2 py-1 text-[11px] font-medium text-zinc-500">即将开放</div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ----------------------------------------------------------------------
// ProfileModal (高级图片直传版)
// ----------------------------------------------------------------------

function ProfileModal({ open, onClose }: ModalProps) {
  const { user, syncSession } = useAuth();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // 用于触发隐藏的 input file
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && user) {
      setNickname(user.nickname || user.name || "");
      setAvatar(user.avatar || "");
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // 核心压缩逻辑：读取本地图片，利用 Canvas 裁剪压缩，输出 Base64 文本
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 限制文件大小 (不能超过 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("图片太大啦，请选择 5MB 以下的图片。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // 创建一个画布，固定将头像压缩至 200x200
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;

        // 等比例缩放计算
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        // 绘制白色背景（防止透明 PNG 变成黑色）
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }

        // 输出为 webp 格式的 base64，极度压缩体积
        const dataUrl = canvas.toDataURL("image/webp", 0.8);
        setAvatar(dataUrl); // 这里的 avatar 已经是一段文本了
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 因为 avatar 现在是一段被压缩的 Base64 文本，所以直接传给后端存进 String 字段里毫无压力
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, avatar }),
      });

      if (res.ok) {
        await syncSession();
        onClose();
      } else {
        alert("保存失败，请稍后重试");
      }
    } catch (error) {
      alert("网络错误");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || !open || !user) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px] transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-[28px] bg-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] transition-all">
        <button onClick={onClose} className="absolute right-6 top-6 text-zinc-400 transition-colors hover:text-zinc-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mt-2 mb-8">
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">账号设置</h2>
          <p className="mt-2 text-sm text-zinc-500">完善你的个人档案</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* 头像上传区：去掉了那个丑陋的 input URL，改为优雅的悬浮上传 */}
          <div className="flex flex-col items-center justify-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative h-[88px] w-[88px] cursor-pointer group rounded-full overflow-hidden shadow-sm border border-zinc-200 bg-zinc-100 flex items-center justify-center transition-all hover:ring-4 hover:ring-zinc-100"
            >
              {avatar ? (
                <img src={avatar} alt="预览" className="h-full w-full object-cover" />
              ) : (
                <span className="text-zinc-400 text-3xl font-medium">
                  {nickname ? nickname.charAt(0).toUpperCase() : "?"}
                </span>
              )}
              
              {/* 悬浮黑色半透明蒙版 + 相机图标 */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-400 font-medium">点击修改头像</p>
            
            {/* 真正执行文件上传的 input (隐藏起来) */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-zinc-700 mb-1.5 ml-1">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="怎么称呼你？"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition-colors text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 bg-zinc-900 text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 focus:outline-none disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {isLoading ? "保存中..." : "保存修改"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}