"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MessageSquareHeart, Send, Loader2, Heart, Smile, Flame, Frown, MessageCircle } from "lucide-react";

type Confession = {
  id: string;
  content: string;
  reactions: Record<string, number>;
  created_at: string;
};

const EMOJIS = ["❤️", "😂", "😢", "😮", "🔥"];

export default function ConfessionsPage() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const fetchConfessions = useCallback(async () => {
    const { data, error } = await supabase
      .from("confessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setConfessions(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfessions();
    const channel = supabase
      .channel("confessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, fetchConfessions)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchConfessions]);

  const handlePost = async () => {
    if (!content.trim() || sending) return;
    setSending(true);

    const { error } = await supabase.from("confessions").insert({
      content: content.trim(),
    });

    if (!error) {
      setContent("");
    }
    setSending(false);
  };

  const handleReact = async (id: string, emoji: string, currentReactions: Record<string, number>) => {
    const newReactions = { ...currentReactions };
    newReactions[emoji] = (newReactions[emoji] || 0) + 1;
    
    await supabase
      .from("confessions")
      .update({ reactions: newReactions })
      .eq("id", id);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="border-b border-border bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center text-pink-500">
            <MessageSquareHeart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Confession Ẩn Danh</h1>
            <p className="text-sm text-muted-foreground">Nói ra những điều thầm kín, không ai biết bạn là ai</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="bg-white border rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full blur-3xl -z-10 -mt-10 -mr-10"/>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Có chuyện gì khó nói à? Kể nghe nè..."
              className="w-full bg-transparent resize-none outline-none text-sm min-h-[100px]"
            />
            <div className="flex justify-end border-t pt-3 mt-2">
              <button
                onClick={handlePost}
                disabled={!content.trim() || sending}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Gửi ẩn danh
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-muted-foreground" /></div>
            ) : confessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground opacity-50">
                <MessageSquareHeart size={48} className="mx-auto mb-3" />
                <p>Chưa có confession nào. Người mở màn đi!</p>
              </div>
            ) : (
              confessions.map((c, i) => (
                <div key={c.id} className="bg-white border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      #{confessions.length - i}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{c.content}</p>
                  
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(c.id, emoji, c.reactions)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium text-gray-600"
                      >
                        <span className="text-base">{emoji}</span>
                        {c.reactions[emoji] > 0 && <span>{c.reactions[emoji]}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
