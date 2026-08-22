"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Search, Loader2 } from "lucide-react";

type Member = {
  id: string;
  display_name: string;
  username: string;
  role: string;
  avatar_url: string | null;
};

type Role = {
  id: string;
  name: string;
  label: string;
  color: string;
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("display_name", { ascending: true }),
      supabase.from("custom_roles").select("*"),
    ]);

    if (profilesRes.data) setMembers(profilesRes.data);
    if (rolesRes.data) setRoles(rolesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMembers = members.filter(
    (m) =>
      m.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleDisplay = (roleName: string) => {
    const role = roles.find((r) => r.name === roleName);
    return role ? { label: role.label, color: role.color } : { label: roleName, color: "#6b7280" };
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Danh sách lớp</h1>
            <p className="text-sm text-muted-foreground">Các thành viên của 12A6</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5 mb-6">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm thành viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {loading ? (
            <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const roleData = getRoleDisplay(member.role);
                const initials = member.display_name.split(" ").map(w => w[0]).join("").slice(-2).toUpperCase();
                
                return (
                  <div key={member.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{member.display_name}</h3>
                      <p className="text-xs text-muted-foreground truncate mb-1">@{member.username}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium inline-block border shadow-sm" style={{ color: roleData.color, borderColor: roleData.color }}>
                        {roleData.label}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {filteredMembers.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Không tìm thấy thành viên nào
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
