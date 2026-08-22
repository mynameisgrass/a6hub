"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Megaphone, Pin, Clock, Shield, Send, Loader2 } from "lucide-react";

type Announcement = {
  id: string;
  content: string;
  pinned: boolean;
  created_at: string;
  author: {
    id: string;
    display_name: string;
    role: string;
  };
};

const ROLE_LABELS: Record<string, string> = {
  leader: "Lớp trưởng",
  vice_leader: "Lớp phó",
};

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("student");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const fetchAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*, author:profiles!author_id(id, display_name, role)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Flatten author from array to object
      const formatted = data.map((a: any) => ({
        ...a,
        author: Array.isArray(a.author) ? a.author[0] : a.author,
      }));
      setAnnouncements(formatted);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Get current user role
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile) setCurrentUserRole(profile.role);
      }
    };
    getUser();
    fetchAnnouncements();

    // Realtime subscription
    const channel = supabase
      .channel("announcements-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => fetchAnnouncements()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAnnouncements]);

  const handlePost = async () => {
    if (!newContent.trim() || sending) return;
    setSending(true);

    const { error } = await supabase.from("announcements").insert({
      content: newContent,
      author_id: currentUserId,
    });

    if (!error) {
      setNewContent("");
      fetchAnnouncements();
    }
    setSending(false);
  };

  const isLeader = currentUserRole === "leader" || currentUserRole === "vice_leader";
  const pinnedAnnouncements = announcements.filter((a) => a.pinned);
  const recentAnnouncements = announcements.filter((a) => !a.pinned);

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Thông báo</h1>
            <p className="text-sm text-muted-foreground">Thông báo từ Ban cán sự lớp • Chỉ BCS được đăng</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Post form — only for leaders */}
          {isLeader && (
            <div className="bg-card border border-border rounded-xl p-4">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Đăng thông báo mới cho lớp..."
                rows={3}
                className="w-full bg-muted rounded-lg px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handlePost}
                  disabled={!newContent.trim() || sending}
                  className="flex items-center gap-2 py-2 px-4 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Đăng thông báo
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
              <p className="text-sm">Đang tải thông báo...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Chưa có thông báo nào</p>
            </div>
          ) : (
            <>
              {pinnedAnnouncements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Pin size={14} className="text-muted-foreground" />
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Đã ghim</h2>
                  </div>
                  <div className="space-y-3">
                    {pinnedAnnouncements.map((a) => (
                      <AnnouncementCard key={a.id} announcement={a} />
                    ))}
                  </div>
                </div>
              )}
              {recentAnnouncements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} className="text-muted-foreground" />
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gần đây</h2>
                  </div>
                  <div className="space-y-3">
                    {recentAnnouncements.map((a) => (
                      <AnnouncementCard key={a.id} announcement={a} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const { author, content, created_at, pinned } = announcement;
  const initials = (author?.display_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(-2);
  const timeStr = new Date(created_at).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`bg-card border rounded-xl p-4 hover:shadow-sm transition-shadow ${pinned ? "border-black/10 bg-black/[0.01]" : "border-border"}`}>
      <div className="flex gap-3">
        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center shrink-0 text-white text-sm font-semibold">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{author?.display_name || "Ẩn danh"}</span>
            {author?.role && author.role !== "student" && (
              <span className="text-[11px] px-1.5 py-0.5 bg-black text-white rounded font-medium flex items-center gap-1">
                <Shield size={10} />
                {ROLE_LABELS[author.role] || author.role}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{timeStr}</span>
          </div>
          <p className="mt-2 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}
