"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeftRight,
  Plus,
  Clock,
  CheckCircle2,
  Search,
  BookOpen,
  Code,
  PenTool,
  Calculator,
  MessageCircle,
  Loader2,
  X,
} from "lucide-react";

type Trade = {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  status: string;
  created_at: string;
  author: { id: string; display_name: string };
};

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "homework", label: "Bài tập" },
  { id: "tutoring", label: "Dạy kèm" },
  { id: "notes", label: "Vở ghi" },
  { id: "other", label: "Khác" },
];

const CAT_ICONS: Record<string, typeof Calculator> = {
  homework: Calculator,
  tutoring: BookOpen,
  notes: PenTool,
  other: Code,
};

export default function TradePage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [creating, setCreating] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("homework");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  const fetchTrades = useCallback(async () => {
    const { data, error } = await supabase
      .from("trades")
      .select("*, author:profiles!author_id(id, display_name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formatted = data.map((t: any) => ({
        ...t,
        author: Array.isArray(t.author) ? t.author[0] : t.author,
      }));
      setTrades(formatted);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || creating) return;
    setCreating(true);

    const { error } = await supabase.from("trades").insert({
      title: newTitle,
      description: newDesc,
      price: newPrice || "Miễn phí",
      category: newCategory,
      author_id: currentUserId,
    });

    if (!error) {
      setNewTitle(""); setNewDesc(""); setNewPrice(""); setNewCategory("homework");
      setShowCreateForm(false);
      fetchTrades();
    }
    setCreating(false);
  };

  const filteredTrades = trades.filter((trade) => {
    const matchesCategory = activeCategory === "all" || trade.category === activeCategory;
    const matchesSearch = trade.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (trade.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const timeSince = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "vừa xong";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Giao dịch</h1>
              <p className="text-sm text-muted-foreground">Trao đổi, mua bán dịch vụ trong lớp</p>
            </div>
          </div>
          <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 py-2 px-4 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            <Plus size={16} />
            Đăng bài
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Create form modal */}
          {showCreateForm && (
            <div className="bg-card border border-border rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-sm">Đăng bài giao dịch mới</h2>
                <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Tiêu đề (VD: Giải bài tập Toán chương 3)" className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/10" required />
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Mô tả chi tiết..." rows={3} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-black/10" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Giá (VD: 20.000đ)" className="px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/10" />
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/10">
                    <option value="homework">Bài tập</option>
                    <option value="tutoring">Dạy kèm</option>
                    <option value="notes">Vở ghi</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreateForm(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                  <button type="submit" disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40">
                    {creating && <Loader2 size={14} className="animate-spin" />}
                    Đăng
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search & Filter */}
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5 mb-4">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input type="text" placeholder="Tìm giao dịch..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeCategory === cat.id ? "bg-black text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Cards */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground"><Loader2 size={24} className="animate-spin mx-auto" /></div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowLeftRight size={40} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrades.map((trade) => {
                const Icon = CAT_ICONS[trade.category] || Code;
                return (
                  <div key={trade.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer group">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-sm text-foreground">{trade.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              bởi <span className="font-medium">{trade.author?.display_name || "Ẩn danh"}</span> • {timeSince(trade.created_at)}
                            </p>
                          </div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0 ${
                            trade.status === "completed" ? "bg-green-50 text-green-700 border border-green-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {trade.status === "completed" ? <><CheckCircle2 size={10} />Đã xong</> : <><Clock size={10} />Đang mở</>}
                          </span>
                        </div>
                        {trade.description && <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{trade.description}</p>}
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm font-bold text-foreground">{trade.price}</span>
                          <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                            <MessageCircle size={14} />Liên hệ
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
