"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Users, Loader2, Plus, X, UserX, UserCheck, Key, Settings2, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ConsolePage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  
  // User Modal State
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newUserRole, setNewUserRole] = useState("student");
  
  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUserRole, setEditUserRole] = useState("");
  const [editResetPassword, setEditResetPassword] = useState("");
  
  // Role Creation Modal State
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#000000");

  // Role Edit Modal State
  const [editingRole, setEditingRole] = useState<any>(null);
  const [permManageUsers, setPermManageUsers] = useState(false);
  const [permManageRoles, setPermManageRoles] = useState(false);
  const [permPostAnnouncements, setPermPostAnnouncements] = useState(false);
  const [permCreateChannels, setPermCreateChannels] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const apiHeaders = useCallback(() => {
    return {
      "Content-Type": "application/json",
      "x-console-password": inputPassword,
    };
  }, [inputPassword]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { headers: apiHeaders() });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setRoles(data.roles || []);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        if (inputPassword) showToast("error", "Sai mật khẩu hoặc phiên hết hạn");
      }
    } catch (err) {
      console.error("fetchData Catch Error:", err);
      if (inputPassword) showToast("error", "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, [apiHeaders, inputPassword]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          display_name: newDisplayName,
          role: newUserRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", `Đã tạo tài khoản ${newUsername}`);
        setNewUsername(""); setNewPassword(""); setNewDisplayName(""); setNewUserRole("student");
        setShowCreateUser(false);
        await fetchData();
      } else {
        showToast("error", data.error || "Lỗi tạo tài khoản");
      }
    } catch (err) {
      console.error("handleCreateUser Catch Error:", err);
      showToast("error", "Lỗi mạng hoặc server không phản hồi");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          action: "create_role",
          name: newRoleName,
          label: newRoleLabel,
          color: newRoleColor,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", `Đã tạo role ${newRoleLabel}`);
        setNewRoleName(""); setNewRoleLabel(""); setNewRoleColor("#000000");
        setShowCreateRole(false);
        await fetchData();
      } else {
        showToast("error", data.error || "Lỗi tạo role");
      }
    } catch (err) {
      console.error("handleCreateRole Catch Error:", err);
      showToast("error", "Lỗi mạng hoặc server không phản hồi");
    } finally {
      setCreating(false);
    }
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setEditDisplayName(user.display_name || "");
    setEditUserRole(user.role || "student");
    setEditResetPassword("");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: apiHeaders(),
        body: JSON.stringify({
          userId: editingUser.id,
          display_name: editDisplayName,
          role: editUserRole,
          resetPassword: editResetPassword || undefined
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", `Đã cập nhật ${editingUser.username}`);
        setEditingUser(null);
        await fetchData();
      } else {
        showToast("error", data.error || "Lỗi cập nhật user");
      }
    } catch {
      showToast("error", "Lỗi kết nối");
    } finally {
      setCreating(false);
    }
  };

  const openEditRole = (role: any) => {
    setEditingRole(role);
    setPermManageUsers(role.perm_manage_users || false);
    setPermManageRoles(role.perm_manage_roles || false);
    setPermPostAnnouncements(role.perm_post_announcements || false);
    setPermCreateChannels(role.perm_create_channels || false);
  };

  const handleUpdateRolePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          action: "update_role",
          name: editingRole.name,
          permissions: {
            perm_manage_users: permManageUsers,
            perm_manage_roles: permManageRoles,
            perm_post_announcements: permPostAnnouncements,
            perm_create_channels: permCreateChannels
          }
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", `Đã cập nhật quyền cho ${editingRole.label}`);
        setEditingRole(null);
        await fetchData();
      } else {
        showToast("error", data.error || "Lỗi cập nhật role");
      }
    } catch (err) {
      console.error("handleUpdateRole Catch Error:", err);
      showToast("error", "Lỗi mạng hoặc server");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: "DELETE",
        headers: apiHeaders(),
      });
      if (res.ok) {
        showToast("success", "Đã xóa người dùng");
        await fetchData();
      }
    } catch {
      showToast("error", "Lỗi khi xóa người dùng");
    }
  };

  const handleDeleteRole = async (roleName: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa role này?")) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ action: "delete_role", roleName }),
      });
      if (res.ok) {
        showToast("success", "Đã xóa role");
        await fetchData();
      } else {
        const data = await res.json();
        showToast("error", data.error || "Lỗi khi xóa role");
      }
    } catch {
      showToast("error", "Lỗi kết nối");
    }
  };

  if (loading && users.length === 0 && isAuthenticated) {
    return <div className="h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-black" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            {toast.message}
          </div>
        )}
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border text-center">
          <div className="w-12 h-12 bg-black text-white rounded-xl mx-auto flex items-center justify-center mb-4">
            <Shield size={24} />
          </div>
          <h1 className="text-xl font-bold mb-2">A6Hub Console</h1>
          <p className="text-sm text-gray-500 mb-6">Vui lòng nhập mật khẩu quản trị viên để tiếp tục</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Mật khẩu..." 
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/20 text-center tracking-widest"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={loading || !inputPassword}
              className="w-full py-2.5 bg-black text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Xác nhận"}
            </button>
          </form>
          <button onClick={() => router.push("/")} className="mt-6 text-sm text-gray-400 hover:text-black">
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center"><Shield size={16} className="text-white" /></div>
            <div>
              <h1 className="font-bold text-sm">A6Hub Console</h1>
              <p className="text-[11px] text-gray-500">Quản trị viên</p>
            </div>
          </div>
          <button onClick={() => router.push("/")} className="text-sm font-medium text-gray-500 hover:text-black">Thoát</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Roles Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 font-bold"><Key size={18} /> Vai trò & Quyền (Roles)</div>
            <button onClick={() => setShowCreateRole(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
              <Plus size={14} /> Tạo Role
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-full text-sm font-medium shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                <span>{role.label} <span className="text-gray-400 text-xs font-normal">({role.name})</span></span>
                <button onClick={() => openEditRole(role)} className="ml-1 text-blue-500 hover:text-blue-700" title="Chỉnh sửa quyền">
                  <Settings2 size={14} />
                </button>
                {!['student', 'leader', 'vice_leader'].includes(role.name) && (
                  <button onClick={() => handleDeleteRole(role.name)} className="text-gray-300 hover:text-red-500 ml-1">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Users Section */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold"><Users size={18} /> Người dùng ({users.length})</div>
            <button onClick={() => setShowCreateUser(true)} className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
              <Plus size={14} /> Tạo tài khoản
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Người dùng</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const roleDef = roles.find(r => r.name === user.role);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold">{user.display_name}</div>
                        {user.first_login && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Mới</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{user.username}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border" style={{ backgroundColor: `${roleDef?.color || '#000'}10`, color: roleDef?.color || '#000', borderColor: `${roleDef?.color || '#000'}20` }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: roleDef?.color || '#000' }} />
                          {roleDef?.label || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditUser(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1" title="Sửa">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                          <UserX size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateUser} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold">Tạo tài khoản mới</h3>
              <button type="button" onClick={() => setShowCreateUser(false)} className="text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Username *</label>
                <input required type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="VD: minhtu" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu *</label>
                <input required type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Mật khẩu mặc định" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên hiển thị</label>
                <input type="text" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="VD: Tú" />
              </div>
              <div className="!mb-8">
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white cursor-pointer relative z-50">
                  {roles.map(r => <option key={r.id} value={r.name}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end">
              <button type="submit" disabled={creating} className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50">
                {creating ? <Loader2 size={16} className="animate-spin" /> : "Tạo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateRole} className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold">Tạo Role mới</h3>
              <button type="button" onClick={() => setShowCreateRole(false)} className="text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mã Role (tiếng Anh không dấu)</label>
                <input required type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="VD: teacher" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên hiển thị</label>
                <input required type="text" value={newRoleLabel} onChange={(e) => setNewRoleLabel(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="VD: Giáo viên" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Màu sắc</label>
                <input type="color" value={newRoleColor} onChange={(e) => setNewRoleColor(e.target.value)} className="w-full h-10 border rounded-lg p-1 cursor-pointer" />
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end">
              <button type="submit" disabled={creating} className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50">
                {creating ? <Loader2 size={16} className="animate-spin" /> : "Tạo Role"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Role Permissions Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleUpdateRolePermissions} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold flex items-center gap-2">Phân quyền: <span className="px-2 py-0.5 rounded text-xs border bg-white" style={{color: editingRole.color}}>{editingRole.label}</span></h3>
              </div>
              <button type="button" onClick={() => setEditingRole(null)} className="text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <PermissionSwitch 
                id="perm1" label="Quản lý tài khoản" desc="Được phép tạo, sửa, xóa người dùng trong hệ thống."
                checked={permManageUsers} onChange={setPermManageUsers} 
              />
              <PermissionSwitch 
                id="perm2" label="Quản lý Role" desc="Được phép thêm bớt vai trò và sửa phân quyền."
                checked={permManageRoles} onChange={setPermManageRoles} 
              />
              <PermissionSwitch 
                id="perm3" label="Đăng thông báo" desc="Được phép đăng bài trong trang Thông báo chung của lớp."
                checked={permPostAnnouncements} onChange={setPermPostAnnouncements} 
              />
              <PermissionSwitch 
                id="perm4" label="Tạo nhóm chat" desc="Được phép tạo các phòng/kênh chat mới."
                checked={permCreateChannels} onChange={setPermCreateChannels} 
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setEditingRole(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
              <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {creating ? <Loader2 size={16} className="animate-spin" /> : "Lưu phân quyền"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleUpdateUser} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold flex items-center gap-2">Chỉnh sửa: <span className="text-gray-500 font-normal">@{editingUser.username}</span></h3>
              <button type="button" onClick={() => setEditingUser(null)} className="text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên hiển thị (Nickname)</label>
                <input type="text" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="VD: Tú" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quyền hạn (Role)</label>
                <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white cursor-pointer relative z-50">
                  {roles.map(r => <option key={r.id} value={r.name}>{r.label}</option>)}
                </select>
              </div>
              <div className="pt-2 border-t mt-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Đặt lại mật khẩu mới (Bỏ trống nếu không đổi)</label>
                <input type="text" value={editResetPassword} onChange={(e) => setEditResetPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50" placeholder="Chỉ nhập khi học sinh quên pass" />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
              <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {creating ? <Loader2 size={16} className="animate-spin" /> : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function PermissionSwitch({ id, label, desc, checked, onChange }: { id: string; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-gray-900 cursor-pointer">{label}</label>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <div className="shrink-0 mt-1">
        <button 
          type="button" 
          id={id}
          role="switch" 
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-black/20 ${checked ? 'bg-black' : 'bg-gray-200'}`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-2' : '-translate-x-2'}`} />
        </button>
      </div>
    </div>
  );
}
