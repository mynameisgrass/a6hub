"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Megaphone,
  MessageCircle,
  ArrowLeftRight,
  FolderOpen,
  Settings,
  LogOut,
  GraduationCap,
  User,
  ChevronDown,
  Users,
  MessageSquareHeart,
  StickyNote,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Thông báo", icon: Megaphone },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/members", label: "Danh sách lớp", icon: Users },
  { href: "/confessions", label: "Confession", icon: MessageSquareHeart },
  { href: "/notes", label: "Ghi chú", icon: StickyNote },
  { href: "/trade", label: "Giao dịch", icon: ArrowLeftRight },
  { href: "/docs", label: "Tài liệu", icon: FolderOpen },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("Người dùng");
  const [userEmail, setUserEmail] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      } else {
        setUserEmail(session.user.email || "");
        // Get display name from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", session.user.id)
          .maybeSingle();
        setUserName(profile?.display_name || session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "Người dùng");
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — Desktop */}
      <aside className="hidden md:flex w-[240px] flex-col border-r border-border bg-card">
        {/* Logo area */}
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">A6</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate leading-none">A6Hub</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Lớp 12A6 — Khóa 23</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium ${
                  active
                    ? "bg-black text-white"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon size={17} className={active ? "text-white" : ""} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile area */}
        <div className="border-t border-border p-3">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                <User size={16} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-none">{userName}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{userEmail || "Chưa đăng nhập"}</p>
              </div>
              <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">A6</span>
          </div>
          <span className="font-bold text-sm">A6Hub</span>
        </div>
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <div className="space-y-1">
            <div className="w-5 h-0.5 bg-foreground rounded" />
            <div className="w-5 h-0.5 bg-foreground rounded" />
            <div className="w-3.5 h-0.5 bg-foreground rounded" />
          </div>
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/20" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute top-14 right-0 w-64 bg-card border-l border-border h-full shadow-xl p-3" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`nav-item flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      active
                        ? "bg-black text-white"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 overflow-hidden md:mt-0 mt-14">
        {children}
      </main>
    </div>
  );
}
