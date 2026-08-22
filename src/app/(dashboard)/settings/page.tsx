"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Settings,
  User,
  Lock,
  Bell,
  Palette,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Check,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [userId, setUserId] = useState("");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setUsername(profile.username || "");
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, username })
      .eq("id", userId);

    if (error) {
      showToast("error", error.message);
    } else {
      showToast("success", "Đã lưu thay đổi!");
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast("error", "Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      showToast("error", error.message);
    } else {
      showToast("success", "Đã đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");

      // Mark first_login as false
      await supabase.from("profiles").update({ first_login: false }).eq("id", userId);
    }
    setSaving(false);
  };

  const tabs = [
    { id: "profile", label: "Hồ sơ", icon: User },
    { id: "password", label: "Đổi mật khẩu", icon: Lock },
    { id: "appearance", label: "Giao diện", icon: Palette },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Cài đặt</h1>
            <p className="text-sm text-muted-foreground">Tùy chỉnh tài khoản và giao diện</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-48 shrink-0">
              <div className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-black text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1">
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <h2 className="text-base font-bold text-foreground mb-4">Hồ sơ cá nhân</h2>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {displayName ? displayName.split(" ").map((w) => w[0]).join("").slice(-2).toUpperCase() : "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{displayName || "Chưa đặt tên"}</p>
                      <p className="text-xs text-muted-foreground">@{username || "unknown"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Tên hiển thị</label>
                      <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-3.5 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3.5 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
                    </div>
                  </div>
                  <button onClick={handleSaveProfile} disabled={saving} className="mt-4 flex items-center gap-2 py-2 px-4 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Lưu thay đổi
                  </button>
                </div>
              )}

              {activeTab === "password" && (
                <div className="space-y-6">
                  <h2 className="text-base font-bold text-foreground mb-1">Đổi mật khẩu</h2>
                  <p className="text-sm text-muted-foreground mb-4">Bạn nên đổi mật khẩu sau lần đầu đăng nhập</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Mật khẩu mới</label>
                      <div className="relative">
                        <input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3.5 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 transition-all pr-10" />
                        <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Tối thiểu 6 ký tự</p>
                    </div>
                  </div>
                  <button onClick={handleChangePassword} disabled={saving || !newPassword} className="mt-4 flex items-center gap-2 py-2 px-4 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    Cập nhật mật khẩu
                  </button>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <h2 className="text-base font-bold text-foreground mb-4">Giao diện</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 border-2 border-black rounded-xl text-center transition-colors">
                      <div className="w-full h-16 bg-white border border-gray-200 rounded-lg mb-3 flex items-center justify-center">
                        <div className="space-y-1">
                          <div className="w-8 h-1 bg-gray-800 rounded" />
                          <div className="w-6 h-1 bg-gray-400 rounded" />
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1.5">
                        <Check size={14} />
                        <span className="text-sm font-medium">Sáng</span>
                      </div>
                    </button>
                    <button className="p-4 border-2 border-border rounded-xl text-center hover:border-gray-400 transition-colors opacity-50 cursor-not-allowed">
                      <div className="w-full h-16 bg-gray-900 rounded-lg mb-3 flex items-center justify-center">
                        <div className="space-y-1">
                          <div className="w-8 h-1 bg-gray-200 rounded" />
                          <div className="w-6 h-1 bg-gray-500 rounded" />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Tối (sắp có)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
