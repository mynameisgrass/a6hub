"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { StickyNote, Plus, Trash2, Pin, CheckCircle2, Loader2, Save } from "lucide-react";

type Note = {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
};

const COLORS = [
  "#ffffff", // White
  "#fef08a", // Yellow
  "#bbf7d0", // Green
  "#bfdbfe", // Blue
  "#fbcfe8", // Pink
  "#e9d5ff", // Purple
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  
  // Create/Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editColor, setEditColor] = useState(COLORS[0]);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    
    if (data) setNotes(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (userId) fetchNotes();
  }, [userId, fetchNotes]);

  const handleCreateNew = () => {
    setEditingId("new");
    setEditTitle("");
    setEditContent("");
    setEditColor(COLORS[0]);
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color);
  };

  const handleSave = async () => {
    if (!userId) return;
    
    if (editingId === "new") {
      await supabase.from("notes").insert({
        user_id: userId,
        title: editTitle,
        content: editContent,
        color: editColor,
      });
    } else if (editingId) {
      await supabase.from("notes").update({
        title: editTitle,
        content: editContent,
        color: editColor,
        updated_at: new Date().toISOString()
      }).eq("id", editingId);
    }
    
    setEditingId(null);
    fetchNotes();
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Xóa ghi chú này?")) return;
    await supabase.from("notes").delete().eq("id", id);
    fetchNotes();
  };

  const togglePin = async (id: string, currentPin: boolean) => {
    await supabase.from("notes").update({ pinned: !currentPin }).eq("id", id);
    fetchNotes();
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-yellow-950">
            <StickyNote className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Ghi chú cá nhân</h1>
            <p className="text-sm text-muted-foreground">Chỉ mình bạn thấy</p>
          </div>
        </div>
        {!editingId && (
          <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800">
            <Plus size={16}/> Tạo ghi chú
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {editingId ? (
          <div className="max-w-2xl mx-auto bg-white border rounded-2xl shadow-lg overflow-hidden transition-colors" style={{ backgroundColor: editColor === '#ffffff' ? '#ffffff' : editColor + '40' }}>
            <div className="p-4 border-b bg-white/50 backdrop-blur-sm flex justify-between items-center">
              <div className="flex gap-1.5">
                {COLORS.map(c => (
                  <button key={c} onClick={()=>setEditColor(c)} className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center" style={{backgroundColor: c}}>
                    {editColor === c && <CheckCircle2 size={12} className="text-black/50" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setEditingId(null)} className="px-3 py-1.5 text-sm font-medium hover:bg-black/5 rounded-lg">Hủy</button>
                <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800"><Save size={14}/> Lưu</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="Tiêu đề..." className="w-full text-xl font-bold bg-transparent outline-none placeholder:text-black/30" autoFocus />
              <textarea value={editContent} onChange={e=>setEditContent(e.target.value)} placeholder="Nội dung ghi chú..." className="w-full h-64 bg-transparent outline-none resize-none text-sm leading-relaxed placeholder:text-black/30" />
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground"/></div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground opacity-50">
            <StickyNote size={48} className="mx-auto mb-3" />
            <p>Bạn chưa có ghi chú nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(note => (
              <div key={note.id} className="group relative border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer" style={{ backgroundColor: note.color === '#ffffff' ? '#ffffff' : note.color + '40' }} onClick={() => handleEdit(note)}>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); togglePin(note.id, note.pinned); }} className={`p-1.5 rounded-lg hover:bg-black/10 ${note.pinned ? 'text-black' : 'text-gray-500'}`}>
                    <Pin size={14} className={note.pinned ? "fill-black" : ""} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
                {note.pinned && <Pin size={12} className="absolute top-4 right-4 fill-black text-black group-hover:opacity-0 transition-opacity" />}
                
                <h3 className="font-bold text-sm mb-2 pr-6 truncate">{note.title || "Không có tiêu đề"}</h3>
                <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-6 leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
