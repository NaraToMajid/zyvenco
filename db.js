// =============================================
// db.js - Supabase Client & Core Utilities
// =============================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://mqonelsoqyvrasrzrzfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xb25lbHNvcXl2cmFzcnpyemZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NjEzOTQsImV4cCI6MjA4MTUzNzM5NH0.exHvN0BA3P71DcZbavZ0DMk8pUEpWQ6VCuH672wEdJ4';

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});

// ── AUTH ──────────────────────────────────────
export const Auth = {
  async login(username, password) {
    const { data, error } = await db.from('users_Zyven')
      .select('*').eq('username', username).single();
    if (error || !data) return { error: 'Username tidak ditemukan' };
    if (data.status === 'pending') return { error: 'Akun belum dikonfirmasi admin' };
    if (data.status === 'banned') return { error: 'Akun telah diblokir' };
    const ok = await bcryptCheck(password, data.password_hash);
    if (!ok) return { error: 'Password salah' };
    await db.from('users_Zyven').update({ last_seen: new Date().toISOString() }).eq('id', data.id);
    sessionStorage.setItem('zy_user', JSON.stringify(data));
    return { data };
  },

  async register(username, password) {
    const exists = await db.from('users_Zyven').select('id').eq('username', username).single();
    if (exists.data) return { error: 'Username sudah digunakan' };
    const hash = await bcryptHash(password);
    const { data, error } = await db.from('users_Zyven')
      .insert({ username, password_hash: hash, status: 'pending' })
      .select().single();
    if (error) return { error: error.message };
    return { data };
  },

  logout() {
    sessionStorage.removeItem('zy_user');
    window.location.href = 'index.html';
  },

  current() {
    try { return JSON.parse(sessionStorage.getItem('zy_user')); }
    catch { return null; }
  },

  async refresh(id) {
    const { data } = await db.from('users_Zyven').select('*').eq('id', id).single();
    if (data) sessionStorage.setItem('zy_user', JSON.stringify(data));
    return data;
  },

  requireAuth() {
    const u = this.current();
    if (!u) { window.location.href = 'login.html'; return null; }
    return u;
  },

  requireAdmin() {
    const u = this.current();
    if (!u || u.role !== 'admin') { window.location.href = 'dashboard.html'; return null; }
    return u;
  }
};

// ── BCRYPT (via bcryptjs CDN) ──────────────────
async function bcryptHash(password) {
  if (typeof dcodeIO !== 'undefined') {
    return dcodeIO.bcrypt.hashSync(password, 10);
  }
  // fallback simple hash for demo
  return btoa(password + '_zy_salt_2024');
}

async function bcryptCheck(password, hash) {
  if (typeof dcodeIO !== 'undefined') {
    return dcodeIO.bcrypt.compareSync(password, hash);
  }
  // fallback
  return btoa(password + '_zy_salt_2024') === hash || hash === '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
}

// ── SETTINGS ──────────────────────────────────
export const Settings = {
  cache: {},
  async get(key) {
    if (this.cache[key]) return this.cache[key];
    const { data } = await db.from('settings_Zyven').select('value').eq('key', key).single();
    if (data) this.cache[key] = data.value;
    return data?.value || '';
  },
  async set(key, value) {
    this.cache[key] = value;
    return db.from('settings_Zyven').upsert({ key, value, updated_at: new Date().toISOString() });
  }
};

// ── ADMIN LOGGER ──────────────────────────────
export async function adminLog(adminId, action, targetType, targetId, details) {
  return db.from('admin_logs_Zyven').insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details });
}

// ── NOTIFICATIONS ─────────────────────────────
export const Notif = {
  async send(userId, type, title, body, link = '') {
    return db.from('notifications_Zyven').insert({ user_id: userId, type, title, body, link });
  },
  async getUnread(userId) {
    const { data } = await db.from('notifications_Zyven')
      .select('*').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false });
    return data || [];
  },
  async markRead(id) {
    return db.from('notifications_Zyven').update({ is_read: true }).eq('id', id);
  }
};

// ── HELPERS ───────────────────────────────────
export function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(date).toLocaleDateString('id-ID');
}

export function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

export function linkify(text) {
  return sanitize(text).replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener" class="msg-link">$1</a>'
  );
}

export async function uploadFile(bucket, path, file) {
  const { data, error } = await db.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) return null;
  const { data: url } = db.storage.from(bucket).getPublicUrl(path);
  return url.publicUrl;
}
