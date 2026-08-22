import { createAdminClient } from '@/lib/supabase'
import { NextRequest } from 'next/server'

const CONSOLE_PASSWORD = 'hl3108'

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

function checkAuth(request: NextRequest) {
  const password = request.headers.get('x-console-password')
  return password === CONSOLE_PASSWORD
}

// GET: List all users
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return unauthorized()

  const admin = createAdminClient()

  // Get all users from auth
  const { data: authData, error: authError } = await admin.auth.admin.listUsers()
  if (authError) {
    return Response.json({ error: authError.message }, { status: 500 })
  }

  // Get all profiles
  const { data: profiles } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get custom roles
  const { data: roles } = await admin
    .from('custom_roles')
    .select('*')
    .order('created_at', { ascending: true })

  // Merge auth + profile data
  const users = authData.users.map((u) => {
    const profile = profiles?.find((p) => p.id === u.id)
    // Extract username from email (remove @a6hub.local)
    const rawUsername = u.email?.replace('@a6hub.local', '') || ''
    return {
      id: u.id,
      email: u.email,
      username: profile?.username || rawUsername,
      display_name: profile?.display_name || u.user_metadata?.display_name || rawUsername,
      role: profile?.role || 'student',
      first_login: profile?.first_login ?? true,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
    }
  })

  return Response.json({ users, roles: roles || [] })
}

// POST: Create a new user OR a new role
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return unauthorized()

  const body = await request.json()

  // === Create Role ===
  if (body.action === 'create_role') {
    const { name, label, color } = body
    if (!name || !label) {
      return Response.json({ error: 'Tên và nhãn vai trò là bắt buộc' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from('custom_roles').insert({
      name: name.toLowerCase().replace(/\s+/g, '_'),
      label,
      color: color || '#000000',
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ success: true })
  }

  // === Update Role ===
  if (body.action === 'update_role') {
    const { name, permissions } = body
    if (!name || !permissions) {
      return Response.json({ error: 'Thiếu dữ liệu' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { error } = await admin.from('custom_roles').update({
      perm_manage_users: permissions.perm_manage_users,
      perm_manage_roles: permissions.perm_manage_roles,
      perm_post_announcements: permissions.perm_post_announcements,
      perm_create_channels: permissions.perm_create_channels
    }).eq('name', name)

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ success: true })
  }

  // === Delete Role ===
  if (body.action === 'delete_role') {
    const { roleName } = body
    // Don't allow deleting default roles
    if (['student', 'leader', 'vice_leader'].includes(roleName)) {
      return Response.json({ error: 'Không thể xóa vai trò mặc định' }, { status: 400 })
    }

    const admin = createAdminClient()
    // Reset users with this role back to student
    await admin.from('profiles').update({ role: 'student' }).eq('role', roleName)
    const { error } = await admin.from('custom_roles').delete().eq('name', roleName)

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ success: true })
  }

  // === Create User ===
  const { username, password, display_name, role } = body

  if (!username || !password) {
    return Response.json({ error: 'Username và mật khẩu là bắt buộc' }, { status: 400 })
  }

  // Convert username to internal email
  const email = `${username.trim().toLowerCase()}@a6hub.local`

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: display_name || username },
  })

  if (error) {
    if (error.message.includes('already been registered')) {
      return Response.json({ error: `Username "${username}" đã tồn tại` }, { status: 400 })
    }
    return Response.json({ error: error.message }, { status: 400 })
  }

  // Update profile role & username
  if (data.user) {
    await admin
      .from('profiles')
      .update({
        role: role || 'student',
        display_name: display_name || username,
        username: username.trim().toLowerCase(),
      })
      .eq('id', data.user.id)
  }

  return Response.json({ user: data.user })
}

// DELETE: Delete a user
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) return unauthorized()

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('id')

  if (!userId) {
    return Response.json({ error: 'User ID is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ success: true })
}

// PATCH: Update user role or reset password
export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) return unauthorized()

  const body = await request.json()
  const { userId, role, display_name, resetPassword } = body

  const admin = createAdminClient()

  if (role || display_name) {
    const updateData: any = {}
    if (role) updateData.role = role
    if (display_name) updateData.display_name = display_name

    const { error } = await admin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }
  }

  if (resetPassword) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: resetPassword,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }
  }

  return Response.json({ success: true })
}
