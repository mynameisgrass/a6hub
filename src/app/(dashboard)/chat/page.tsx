"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  MessageCircle, Search, Plus, Send, Lock, Hash, ArrowLeft, EyeOff, Loader2, X, Headphones, UserPlus, Users, Maximize, Minimize
} from "lucide-react";
import {
  LiveKitRoom,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";

type Channel = { 
  id: string; name: string; type: string; created_at: string; created_by: string;
  channel_members: { user_id: string }[];
};
type Message = { id: string; content: string; type: string; created_at: string; author: { id: string; display_name: string; }; };
type Profile = { id: string; display_name: string; username: string; };

const TYPE_ICONS: Record<string, typeof Hash> = { group: Hash, private: Lock, hidden: EyeOff, dm: MessageCircle };

export default function ChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string>("");
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("group");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // LiveKit State
  const [activeVoiceRoom, setActiveVoiceRoom] = useState<string | null>(null);
  const [voiceToken, setVoiceToken] = useState<string>("");
  const voicePanelRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      voicePanelRef.current?.requestFullscreen().catch((err) => {
        console.error("Lỗi fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Add Member State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
        setCurrentUserDisplayName(profile?.display_name || user.email?.split("@")[0] || "Người dùng");
      }
    };
    getUser();
  }, []);

  const fetchChannels = useCallback(async () => {
    const { data, error } = await supabase
      .from("channels")
      .select("*, channel_members(user_id)")
      .order("created_at", { ascending: true });

    if (!error && data) {
      // Filter channels based on access
      const accessibleChannels = data.filter((c: any) => {
        if (c.type === 'group') return true;
        const isMember = c.channel_members?.some((m: any) => m.user_id === currentUserId);
        const isCreator = c.created_by === currentUserId;
        return isMember || isCreator;
      });
      
      setChannels(accessibleChannels);
      if (accessibleChannels.length > 0 && !activeChannel) setActiveChannel(accessibleChannels[0].id);
    }
    setLoadingChannels(false);
  }, [activeChannel, currentUserId]);

  useEffect(() => { 
    if (currentUserId) fetchChannels(); 
  }, [fetchChannels, currentUserId]);

  const fetchMessages = useCallback(async () => {
    if (!activeChannel) return;
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*, author:profiles!author_id(id, display_name)")
      .eq("channel_id", activeChannel)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!error && data) {
      const formatted = data.map((m: any) => ({ ...m, author: Array.isArray(m.author) ? m.author[0] : m.author }));
      setMessages(formatted);
    }
    setLoadingMessages(false);
  }, [activeChannel]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!activeChannel) return;
    const channel = supabase.channel(`messages-${activeChannel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${activeChannel}` }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChannel, fetchMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || sending || !activeChannel || !currentUserId) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ channel_id: activeChannel, author_id: currentUserId, content: message, type: "text" });
    if (!error) setMessage("");
    setSending(false);
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    const { data, error } = await supabase.from("channels").insert({ name: newChannelName, type: newChannelType, created_by: currentUserId }).select().single();
    if (!error) { 
      // If private, automatically add creator to channel_members
      if (newChannelType !== 'group' && data) {
        await supabase.from("channel_members").insert({ channel_id: data.id, user_id: currentUserId });
      }
      setNewChannelName(""); setShowCreateModal(false); fetchChannels(); 
    }
  };

  const joinVoiceRoom = async () => {
    if (!activeChannel || !currentUserDisplayName) return;
    try {
      const res = await fetch(`/api/livekit?room=${activeChannel}&username=${encodeURIComponent(currentUserDisplayName)}`);
      const data = await res.json();
      if (data.token) {
        setVoiceToken(data.token);
        setActiveVoiceRoom(activeChannel);
      } else {
        alert("Lỗi LiveKit: " + data.error);
      }
    } catch (err) {
      console.error("Failed to join voice room:", err);
    }
  };

  const openAddMemberModal = async () => {
    setShowAddMemberModal(true);
    const { data } = await supabase.from("profiles").select("id, display_name, username");
    if (data) setAllProfiles(data);
  };

  const handleAddMember = async () => {
    if (!activeChannel || !selectedUserId) return;
    const { error } = await supabase.from("channel_members").insert({ channel_id: activeChannel, user_id: selectedUserId });
    if (!error) {
      alert("Đã thêm thành viên thành công!");
      setShowAddMemberModal(false);
      fetchChannels();
    } else {
      alert("Lỗi thêm thành viên: " + error.message);
    }
  };

  const filteredChannels = channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const groupChannels = filteredChannels.filter(c => c.type === "group");
  const privateChannels = filteredChannels.filter(c => c.type === "private" || c.type === "hidden");
  const dmChannels = filteredChannels.filter(c => c.type === "dm");
  const currentChannel = channels.find(c => c.id === activeChannel);

  const canAddMember = currentChannel && currentChannel.type !== 'group' && currentChannel.created_by === currentUserId;

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex w-full md:w-72 flex-col border-r border-border bg-card`}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input type="text" placeholder="Tìm kênh..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {loadingChannels ? (
            <div className="text-center py-8 text-muted-foreground"><Loader2 size={20} className="animate-spin mx-auto" /></div>
          ) : (
            <>
              <ChannelSection title="Kênh chung" channels={groupChannels} activeChannel={activeChannel} onSelect={(id) => { setActiveChannel(id); setShowSidebar(false); }} />
              <ChannelSection title="Nhóm riêng" channels={privateChannels} activeChannel={activeChannel} onSelect={(id) => { setActiveChannel(id); setShowSidebar(false); }} />
              <ChannelSection title="Tin nhắn riêng" channels={dmChannels} activeChannel={activeChannel} onSelect={(id) => { setActiveChannel(id); setShowSidebar(false); }} />
            </>
          )}
        </div>
        <div className="p-3 border-t border-border">
          <button onClick={() => setShowCreateModal(true)} className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            <Plus size={16} /> Tạo nhóm chat
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!showSidebar ? "flex" : "hidden"} md:flex flex-1 flex-col`}>
        {/* Chat Header */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(true)} className="md:hidden p-1.5 hover:bg-accent rounded-lg transition-colors"><ArrowLeft size={18} /></button>
            {currentChannel && (
              <>
                {(() => { const Icon = TYPE_ICONS[currentChannel.type] || Hash; return <Icon size={18} className="text-muted-foreground" />; })()}
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{currentChannel.name}</h2>
                  <p className="text-[11px] text-muted-foreground">{currentChannel.type === "group" ? "Kênh chung" : "Nhóm riêng"}</p>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {canAddMember && (
              <button onClick={openAddMemberModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                <UserPlus size={16} /> <span className="hidden sm:inline">Thêm thành viên</span>
              </button>
            )}
            
            {currentChannel && activeVoiceRoom !== currentChannel.id && (
              <button onClick={joinVoiceRoom} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-lg text-sm font-medium transition-colors">
                <Headphones size={16} /> Voice Chat
              </button>
            )}
          </div>
        </div>

        {/* LiveKit Voice Panel */}
        {activeVoiceRoom === currentChannel?.id && voiceToken && (
          <div 
            ref={voicePanelRef} 
            className={`border-b border-border bg-black text-white shrink-0 shadow-inner ${isFullscreen ? 'h-screen w-screen flex flex-col' : ''}`}
          >
            <LiveKitRoom
              video={true}
              audio={true}
              token={voiceToken}
              serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
              onDisconnected={() => { setActiveVoiceRoom(null); setVoiceToken(""); if(document.fullscreenElement) document.exitFullscreen(); }}
              className={`p-4 flex flex-col gap-4 overflow-hidden ${isFullscreen ? 'flex-1' : 'min-h-[50vh] max-h-[70vh]'}`}
            >
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">Đang trong phòng thoại: {currentChannel.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                  <button onClick={() => { setActiveVoiceRoom(null); setVoiceToken(""); if(document.fullscreenElement) document.exitFullscreen(); }} className="p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-500 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden rounded-xl border border-white/10 relative bg-gray-900">
                <VideoConference />
              </div>
            </LiveKitRoom>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 bg-gray-50/50">
          <div className="max-w-3xl mx-auto space-y-3">
            {loadingMessages ? (
              <div className="text-center py-12 text-muted-foreground"><Loader2 size={20} className="animate-spin mx-auto" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle size={40} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.author?.id === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%]`}>
                      {!isMe && <p className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">{msg.author?.display_name || "Ẩn danh"}</p>}
                      <div className={`px-3.5 py-2.5 text-sm leading-relaxed ${isMe ? "bg-black text-white rounded-2xl rounded-tr-sm" : "bg-white border text-foreground rounded-2xl rounded-tl-sm shadow-sm"}`}>{msg.content}</div>
                      <p className={`text-[10px] text-muted-foreground mt-1 ${isMe ? "text-right mr-1" : "ml-1"}`}>{new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card p-3 shrink-0">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className="flex-1 bg-muted rounded-xl px-3.5 py-2.5 flex items-center border shadow-inner">
              <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder={`Nhắn tin vào ${currentChannel?.name || ""}...`} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            <button onClick={handleSend} disabled={!message.trim() || sending} className="p-2.5 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Modals... */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl border shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Tạo nhóm chat mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên nhóm</label>
                <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="VD: Nhóm ôn Toán" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loại</label>
                <select value={newChannelType} onChange={(e) => setNewChannelType(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10">
                  <option value="group">Công khai</option>
                  <option value="private">Riêng tư</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowCreateModal(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                <button onClick={handleCreateChannel} disabled={!newChannelName.trim()} className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors">Tạo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowAddMemberModal(false)}>
          <div className="bg-white rounded-2xl border shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Thêm thành viên</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chọn người dùng</label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10">
                  <option value="">-- Chọn thành viên --</option>
                  {allProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name} (@{p.username})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAddMemberModal(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                <button onClick={handleAddMember} disabled={!selectedUserId} className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors">Thêm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component to list voice participants
function VoiceParticipantList() {
  const participants = useParticipants();
  if (participants.length === 0) return <div className="text-sm text-gray-400">Đang chờ mọi người tham gia...</div>;
  
  return (
    <div className="flex flex-wrap gap-2">
      {participants.map(p => (
        <div key={p.sid} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium border border-white/5">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            {p.name ? p.name[0].toUpperCase() : "?"}
          </div>
          <span className="truncate max-w-[100px]">{p.name || p.identity}</span>
          {p.isSpeaking && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-1" />}
        </div>
      ))}
    </div>
  );
}

function ChannelSection({ title, channels, activeChannel, onSelect }: any) {
  if (channels.length === 0) return null;
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">{title}</h3>
      <div className="space-y-0.5">
        {channels.map((channel: any) => {
          const Icon = TYPE_ICONS[channel.type] || Hash;
          const active = activeChannel === channel.id;
          return (
            <button key={channel.id} onClick={() => onSelect(channel.id)} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors text-left ${active ? "bg-black text-white shadow-sm" : "text-foreground/80 hover:bg-accent"}`}>
              <Icon size={16} className={active ? "text-white/70" : "text-muted-foreground"} />
              <span className="flex-1 truncate font-medium">{channel.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
