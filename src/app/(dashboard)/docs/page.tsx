"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  FolderOpen,
  FileText,
  Download,
  Search,
  Upload,
  Eye,
  Clock,
  User,
  Loader2,
  Calculator,
  Beaker,
  BookOpen,
  Globe,
  Palette,
  X,
} from "lucide-react";

type Document = {
  id: string;
  name: string;
  subject: string;
  file_url: string;
  file_size: string;
  downloads: number;
  created_at: string;
  uploader: { id: string; display_name: string };
};

const SUBJECTS = [
  { id: "all", label: "Tất cả", icon: FolderOpen },
  { id: "math", label: "Toán", icon: Calculator },
  { id: "physics", label: "Lý", icon: Beaker },
  { id: "chemistry", label: "Hóa", icon: Beaker },
  { id: "literature", label: "Văn", icon: BookOpen },
  { id: "english", label: "Anh", icon: Globe },
  { id: "other", label: "Khác", icon: Palette },
];

export default function DocsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [uploading, setUploading] = useState(false);

  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSubject, setUploadSubject] = useState("math");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  const fetchDocs = useCallback(async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*, uploader:profiles!uploader_id(id, display_name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formatted = data.map((d: any) => ({
        ...d,
        uploader: Array.isArray(d.uploader) ? d.uploader[0] : d.uploader,
      }));
      setDocs(formatted);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || uploading || !currentUserId) return;
    setUploading(true);

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}_${uploadFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, uploadFile);

    if (uploadError) {
      alert("Lỗi tải file: " + uploadError.message);
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName);

    // Save to DB
    const fileSize = uploadFile.size > 1024 * 1024
      ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(uploadFile.size / 1024).toFixed(0)} KB`;

    await supabase.from("documents").insert({
      name: uploadFile.name,
      subject: uploadSubject,
      file_url: urlData.publicUrl,
      file_size: fileSize,
      uploader_id: currentUserId,
    });

    setUploadFile(null);
    setShowUpload(false);
    fetchDocs();
    setUploading(false);
  };

  const handleDownload = async (doc: Document) => {
    // Increment download count
    await supabase.from("documents").update({ downloads: doc.downloads + 1 }).eq("id", doc.id);
    window.open(doc.file_url, "_blank");
    fetchDocs();
  };

  const filteredDocs = docs.filter((doc) => {
    const matchesSubject = activeSubject === "all" || doc.subject === activeSubject;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Tài liệu</h1>
              <p className="text-sm text-muted-foreground">Bài giảng, đề thi, và tài liệu học tập</p>
            </div>
          </div>
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 py-2 px-4 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            <Upload size={16} />
            Tải lên
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Upload modal */}
          {showUpload && (
            <div className="bg-card border border-border rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-sm">Tải lên tài liệu</h2>
                <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              <form onSubmit={handleUpload} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Chọn file (PDF, DOCX, ...)</label>
                  <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Môn học</label>
                  <select value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/10">
                    <option value="math">Toán</option>
                    <option value="physics">Lý</option>
                    <option value="chemistry">Hóa</option>
                    <option value="literature">Văn</option>
                    <option value="english">Anh</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowUpload(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                  <button type="submit" disabled={!uploadFile || uploading} className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40">
                    {uploading && <Loader2 size={14} className="animate-spin" />}
                    Tải lên
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5 mb-4">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input type="text" placeholder="Tìm tài liệu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>

          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            {SUBJECTS.map((sub) => (
              <button key={sub.id} onClick={() => setActiveSubject(sub.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeSubject === sub.id ? "bg-black text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                {sub.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground"><Loader2 size={24} className="animate-spin mx-auto" /></div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Không tìm thấy tài liệu nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-500">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">{doc.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User size={11} />{doc.uploader?.display_name || "Ẩn danh"}</span>
                        <span className="flex items-center gap-1"><Clock size={11} />{new Date(doc.created_at).toLocaleDateString("vi-VN")}</span>
                        {doc.file_size && <span>{doc.file_size}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-muted-foreground mr-2">{doc.downloads} lượt tải</span>
                      <button onClick={() => handleDownload(doc)} className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
