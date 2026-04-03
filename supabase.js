// supabase.js - Zyvenqo Supabase Client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://mqonelsoqyvrasrzrzfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xb25lbHNvcXl2cmFzcnpyemZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NjEzOTQsImV4cCI6MjA4MTUzNzM5NH0.exHvN0BA3P71DcZbavZ0DMk8pUEpWQ6VCuH672wEdJ4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});

// ─── AUTH HELPERS ───────────────────────────────────────────
export const ADMIN_USERNAME = 'administrator';
export const ADMIN_PASSWORD = 'Rantauprapat123';

export function getCurrentUser() {
  const raw = localStorage.getItem('zyvenqo_user');
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(user) {
  localStorage.setItem('zyvenqo_user', JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem('zyvenqo_user');
}

export function isLoggedIn() {
  return !!getCurrentUser();
}

export function isAdmin() {
  const u = getCurrentUser();
  return u && u.is_admin;
}

// ─── SIMPLE PASSWORD HASH (client-side, for demo) ───────────
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'zyvenqo_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── USER OPERATIONS ────────────────────────────────────────
export async function registerUser(username, password) {
  const hash = await hashPassword(password);
  const { data, error } = await supabase
    .from('users_Zyvenqo')
    .insert([{ username, password_hash: hash, display_name: username }])
    .select()
    .single();
  return { data, error };
}

export async function loginUser(username, password) {
  // Admin shortcut
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const { data, error } = await supabase
      .from('users_Zyvenqo')
      .select('*')
      .eq('username', username)
      .single();
    if (data) return { data, error: null };
  }
  const hash = await hashPassword(password);
  const { data, error } = await supabase
    .from('users_Zyvenqo')
    .select('*')
    .eq('username', username)
    .eq('password_hash', hash)
    .single();
  return { data, error };
}

export async function getUserByUsername(username) {
  const { data, error } = await supabase
    .from('users_Zyvenqo')
    .select('*')
    .eq('username', username)
    .single();
  return { data, error };
}

export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('users_Zyvenqo')
    .update({ ...updates, last_seen: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
}

// ─── PROJECT OPERATIONS ─────────────────────────────────────
export async function createProject(ownerId, name, description, visibility) {
  const { data, error } = await supabase
    .from('projects_Zyvenqo')
    .insert([{ owner_id: ownerId, name, description, visibility }])
    .select()
    .single();
  return { data, error };
}

export async function getProjectsByUser(userId) {
  const { data, error } = await supabase
    .from('projects_Zyvenqo')
    .select('*, users_Zyvenqo(username, display_name, avatar_url)')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });
  return { data, error };
}

export async function getPublicProjects(searchTerm = '') {
  let query = supabase
    .from('projects_Zyvenqo')
    .select('*, users_Zyvenqo(username, display_name, avatar_url)')
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false });
  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`);
  }
  const { data, error } = await query;
  return { data, error };
}

export async function getProjectById(projectId) {
  const { data, error } = await supabase
    .from('projects_Zyvenqo')
    .select('*, users_Zyvenqo(username, display_name, avatar_url)')
    .eq('id', projectId)
    .single();
  return { data, error };
}

export async function updateProject(projectId, updates) {
  const { data, error } = await supabase
    .from('projects_Zyvenqo')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();
  return { data, error };
}

export async function deleteProject(projectId) {
  const { error } = await supabase
    .from('projects_Zyvenqo')
    .delete()
    .eq('id', projectId);
  return { error };
}

// ─── FILE OPERATIONS ────────────────────────────────────────
export async function getFilesByProject(projectId) {
  const { data, error } = await supabase
    .from('files_Zyvenqo')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true });
  return { data, error };
}

export async function createFile(projectId, name, content, fileType = 'text', path = '/') {
  const size = new Blob([content]).size;
  const { data, error } = await supabase
    .from('files_Zyvenqo')
    .insert([{ project_id: projectId, name, content, file_type: fileType, size_bytes: size, path }])
    .select()
    .single();
  return { data, error };
}

export async function updateFile(fileId, updates) {
  const { data, error } = await supabase
    .from('files_Zyvenqo')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', fileId)
    .select()
    .single();
  return { data, error };
}

export async function deleteFile(fileId) {
  const { error } = await supabase
    .from('files_Zyvenqo')
    .delete()
    .eq('id', fileId);
  return { error };
}

// ─── MESSAGING ──────────────────────────────────────────────
export async function sendMessage(senderId, receiverId, content, msgType = 'text') {
  const { data, error } = await supabase
    .from('messages_Zyvenqo')
    .insert([{ sender_id: senderId, receiver_id: receiverId, content, msg_type: msgType }])
    .select()
    .single();
  return { data, error };
}

export async function getConversation(userId1, userId2) {
  const { data, error } = await supabase
    .from('messages_Zyvenqo')
    .select('*, sender:sender_id(username, display_name, avatar_url)')
    .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function getConversationList(userId) {
  const { data, error } = await supabase
    .from('messages_Zyvenqo')
    .select('*, sender:sender_id(username, display_name, avatar_url), receiver:receiver_id(username, display_name, avatar_url)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  return { data, error };
}

// ─── GLOBAL CHAT ─────────────────────────────────────────────
export async function sendGlobalMessage(userId, content, msgType = 'text') {
  const { data, error } = await supabase
    .from('global_chat_Zyvenqo')
    .insert([{ user_id: userId, content, msg_type: msgType }])
    .select()
    .single();
  return { data, error };
}

export async function getGlobalMessages(limit = 50) {
  const { data, error } = await supabase
    .from('global_chat_Zyvenqo')
    .select('*, users_Zyvenqo(username, display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data?.reverse(), error };
}

// ─── STARS ───────────────────────────────────────────────────
export async function starProject(userId, projectId) {
  const { data, error } = await supabase
    .from('stars_Zyvenqo')
    .insert([{ user_id: userId, project_id: projectId }])
    .select()
    .single();
  if (!error) {
    await supabase.rpc('increment_stars', { project_id: projectId }).catch(() => {
      supabase.from('projects_Zyvenqo').select('stars').eq('id', projectId).single()
        .then(({ data: p }) => {
          if (p) supabase.from('projects_Zyvenqo').update({ stars: p.stars + 1 }).eq('id', projectId);
        });
    });
  }
  return { data, error };
}

export async function unstarProject(userId, projectId) {
  const { error } = await supabase
    .from('stars_Zyvenqo')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);
  return { error };
}

export async function isStarred(userId, projectId) {
  const { data } = await supabase
    .from('stars_Zyvenqo')
    .select('id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single();
  return !!data;
}

// ─── FOLLOWS ─────────────────────────────────────────────────
export async function followUser(followerId, followingId) {
  const { data, error } = await supabase
    .from('follows_Zyvenqo')
    .insert([{ follower_id: followerId, following_id: followingId }])
    .select()
    .single();
  return { data, error };
}

export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase
    .from('follows_Zyvenqo')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  return { error };
}

// ─── REPORTS ─────────────────────────────────────────────────
export async function submitReport(reporterId, targetType, targetId, reason) {
  const { data, error } = await supabase
    .from('reports_Zyvenqo')
    .insert([{ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason }])
    .select()
    .single();
  return { data, error };
}

export async function getReports() {
  const { data, error } = await supabase
    .from('reports_Zyvenqo')
    .select('*, reporter:reporter_id(username, display_name)')
    .order('created_at', { ascending: false });
  return { data, error };
}

// ─── HELP MESSAGES ───────────────────────────────────────────
export async function sendHelpMessage(userId, type, subject, content) {
  const { data, error } = await supabase
    .from('help_messages_Zyvenqo')
    .insert([{ user_id: userId, type, subject, content }])
    .select()
    .single();
  return { data, error };
}

export async function getHelpMessages() {
  const { data, error } = await supabase
    .from('help_messages_Zyvenqo')
    .select('*, users_Zyvenqo(username, display_name)')
    .order('created_at', { ascending: false });
  return { data, error };
}

// ─── NOTIFICATIONS ───────────────────────────────────────────
export async function createNotification(userId, type, content, link = '') {
  const { data, error } = await supabase
    .from('notifications_Zyvenqo')
    .insert([{ user_id: userId, type, content, link }])
    .select()
    .single();
  return { data, error };
}

export async function getUserNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications_Zyvenqo')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  return { data, error };
}

export async function markNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications_Zyvenqo')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return { error };
}

// ─── SITE SETTINGS ───────────────────────────────────────────
export async function getSetting(key) {
  const { data } = await supabase
    .from('settings_Zyvenqo')
    .select('value')
    .eq('key', key)
    .single();
  return data?.value || '';
}

export async function setSetting(key, value) {
  const { data, error } = await supabase
    .from('settings_Zyvenqo')
    .upsert([{ key, value, updated_at: new Date().toISOString() }])
    .select()
    .single();
  return { data, error };
}

// ─── UPLOAD TO STORAGE ───────────────────────────────────────
export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  if (data) {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: urlData.publicUrl, error: null };
  }
  return { url: null, error };
}

// ─── ADMIN ───────────────────────────────────────────────────
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users_Zyvenqo')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function getAllProjects() {
  const { data, error } = await supabase
    .from('projects_Zyvenqo')
    .select('*, users_Zyvenqo(username, display_name)')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function updateUserStatus(userId, status) {
  const { data, error } = await supabase
    .from('users_Zyvenqo')
    .update({ status })
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
}

export async function deleteUser(userId) {
  const { error } = await supabase
    .from('users_Zyvenqo')
    .delete()
    .eq('id', userId);
  return { error };
}

export async function getAdminStats() {
  const [users, projects, reports, help] = await Promise.all([
    supabase.from('users_Zyvenqo').select('id, status, created_at'),
    supabase.from('projects_Zyvenqo').select('id, visibility, created_at'),
    supabase.from('reports_Zyvenqo').select('id, status'),
    supabase.from('help_messages_Zyvenqo').select('id, status')
  ]);
  return {
    totalUsers: users.data?.length || 0,
    activeUsers: users.data?.filter(u => u.status === 'active').length || 0,
    pendingUsers: users.data?.filter(u => u.status === 'pending').length || 0,
    totalProjects: projects.data?.length || 0,
    publicProjects: projects.data?.filter(p => p.visibility === 'public').length || 0,
    pendingReports: reports.data?.filter(r => r.status === 'pending').length || 0,
    unreadHelp: help.data?.filter(h => h.status === 'unread').length || 0,
  };
}

// ─── REALTIME SUBSCRIPTIONS ──────────────────────────────────
export function subscribeToMessages(callback) {
  return supabase
    .channel('messages_Zyvenqo')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_Zyvenqo' }, callback)
    .subscribe();
}

export function subscribeToGlobalChat(callback) {
  return supabase
    .channel('global_chat_Zyvenqo')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat_Zyvenqo' }, callback)
    .subscribe();
}

export function subscribeToUserStatus(userId, callback) {
  return supabase
    .channel(`user_status_${userId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users_Zyvenqo', filter: `id=eq.${userId}` }, callback)
    .subscribe();
}

export function subscribeToNotifications(userId, callback) {
  return supabase
    .channel(`notifications_${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications_Zyvenqo', filter: `user_id=eq.${userId}` }, callback)
    .subscribe();
}
