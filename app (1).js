// app.js — Shared utilities for Zyvenqo
import { getCurrentUser, clearCurrentUser, getUserNotifications, markNotificationsRead, getSetting, subscribeToNotifications } from './supabase.js';

// ─── AUTH GUARD ──────────────────────────────────────────────
export function requireAuth() {
  const user = getCurrentUser();
  if (!user) { window.location.href = 'login.html'; return null; }
  if (user.status !== 'active') { clearCurrentUser(); window.location.href = 'login.html'; return null; }
  return user;
}

export function requireAdmin() {
  const user = requireAuth();
  if (!user) return null;
  if (!user.is_admin) { window.location.href = 'dashboard.html'; return null; }
  return user;
}

// ─── TOAST ───────────────────────────────────────────────────
export function showToast(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation'
  };
  const colors = { success: 'var(--success)', error: 'var(--danger)', info: 'var(--info)', warning: 'var(--warning)' };
  t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}" style="color:${colors[type]}"></i> ${msg}`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    t.style.transition = '0.3s';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ─── MODAL ───────────────────────────────────────────────────
export function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.style.display = 'flex';
  requestAnimationFrame(() => m.classList.add('show'));
}

export function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('show');
  setTimeout(() => { m.style.display = 'none'; }, 200);
}

export function createModal(id, title, bodyHTML, footerHTML = '') {
  let m = document.getElementById(id);
  if (m) m.remove();
  m = document.createElement('div');
  m.className = 'modal-backdrop';
  m.id = id;
  m.style.display = 'none';
  m.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="btn-ghost btn" onclick="closeModal('${id}')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>`;
  m.addEventListener('click', () => closeModal(id));
  document.body.appendChild(m);
  window.closeModal = closeModal;
  return m;
}

// ─── CONFIRM DIALOG ──────────────────────────────────────────
export function confirmDialog(message, onConfirm, danger = false) {
  createModal('confirm-dialog', 'Konfirmasi',
    `<p class="text-sm" style="margin-bottom:8px;">${message}</p>`,
    `<button class="btn btn-secondary btn-sm" onclick="closeModal('confirm-dialog')">Batal</button>
     <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" id="confirm-ok">Konfirmasi</button>`
  );
  openModal('confirm-dialog');
  document.getElementById('confirm-ok').addEventListener('click', () => {
    closeModal('confirm-dialog');
    onConfirm();
  });
}

// ─── MOBILE SIDEBAR TOGGLE ───────────────────────────────────
export function initMobileSidebar() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  });
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}

// ─── TOPBAR NOTIFICATIONS ────────────────────────────────────
export async function initNotifications(userId) {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;
  const { data: notifs } = await getUserNotifications(userId);
  updateNotifBadge(notifs);

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    if (panel.style.display === 'block') {
      renderNotifications(notifs || []);
      await markNotificationsRead(userId);
      const dot = btn.querySelector('.notification-dot');
      if (dot) dot.style.display = 'none';
    }
  });

  document.addEventListener('click', () => {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.style.display = 'none';
  });

  // Subscribe to new notifications
  subscribeToNotifications(userId, payload => {
    notifs?.unshift(payload.new);
    const dot = btn.querySelector('.notification-dot');
    if (dot) dot.style.display = 'block';
    showToast(payload.new.content, 'info');
  });
}

function updateNotifBadge(notifs) {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;
  const unread = notifs?.filter(n => !n.is_read).length || 0;
  const dot = btn.querySelector('.notification-dot');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
}

function renderNotifications(notifs) {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  if (!notifs.length) {
    panel.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;"><i class="fa-solid fa-bell" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4"></i>Tidak ada notifikasi</div>`;
    return;
  }
  panel.innerHTML = `
    <div style="padding:10px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-3);border-bottom:1px solid var(--border);">
      Notifikasi
    </div>
    ${notifs.slice(0, 10).map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" ${n.link ? `onclick="window.location.href='${n.link}'"` : ''}>
        <div class="notif-icon">
          <i class="fa-solid fa-bell" style="font-size:13px;color:var(--accent-2)"></i>
        </div>
        <div>
          <div class="notif-text">${n.content}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
      </div>`).join('')}`;
}

// ─── THEME TOGGLE ────────────────────────────────────────────
export function initTheme(user) {
  const theme = user?.theme || localStorage.getItem('zyvenqo_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme(userId, updateFn) {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('zyvenqo_theme', next);
  if (userId && updateFn) updateFn(userId, { theme: next });
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = next === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

// ─── SIDEBAR LOGO ────────────────────────────────────────────
export async function loadSidebarLogo() {
  const logoUrl = await getSetting('logo_url');
  const img = document.getElementById('sidebar-logo-img');
  if (!img) return;
  if (logoUrl) {
    img.innerHTML = `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`;
  }
}

// ─── AVATAR HELPER ───────────────────────────────────────────
export function avatarHTML(user, size = 'sm') {
  if (user?.avatar_url) {
    return `<img src="${user.avatar_url}" class="avatar avatar-${size}" alt="${user.display_name || user.username}" />`;
  }
  const initials = (user?.display_name || user?.username || '?').charAt(0).toUpperCase();
  return `<div class="avatar avatar-${size}">${initials}</div>`;
}

// ─── TIME AGO ────────────────────────────────────────────────
export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'baru saja';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID');
}

// ─── FORMAT DATE ─────────────────────────────────────────────
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// ─── FORMAT BYTES ────────────────────────────────────────────
export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─── DETECT LINKS IN TEXT ────────────────────────────────────
export function linkify(text) {
  // Italic with *text*
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // URLs
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener" style="color:var(--link)">${url}</a>`);
}

// ─── FILE TYPE ICON ──────────────────────────────────────────
export function fileTypeIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    js: 'fa-brands fa-js text-warning',
    ts: 'fa-brands fa-square-js text-info',
    jsx: 'fa-brands fa-react text-info',
    tsx: 'fa-brands fa-react text-info',
    html: 'fa-brands fa-html5 text-danger',
    css: 'fa-brands fa-css3-alt text-info',
    py: 'fa-brands fa-python text-warning',
    rb: 'fa-solid fa-gem text-danger',
    php: 'fa-brands fa-php text-accent',
    go: 'fa-solid fa-golang text-info',
    rs: 'fa-solid fa-gear text-warning',
    json: 'fa-solid fa-brackets-curly text-success',
    md: 'fa-brands fa-markdown text-muted',
    txt: 'fa-solid fa-file-lines text-muted',
    png: 'fa-solid fa-image text-success',
    jpg: 'fa-solid fa-image text-success',
    jpeg: 'fa-solid fa-image text-success',
    gif: 'fa-solid fa-image text-success',
    svg: 'fa-solid fa-vector-square text-accent',
    sql: 'fa-solid fa-database text-warning',
    sh: 'fa-solid fa-terminal text-success',
    env: 'fa-solid fa-key text-warning',
  };
  return map[ext] || 'fa-solid fa-file text-muted';
}

// ─── SIDEBAR TEMPLATE ────────────────────────────────────────
export function renderSidebar(user, activePage) {
  const isAdmin = user?.is_admin;
  const pages = isAdmin ? [
    { id: 'admin', icon: 'fa-solid fa-gauge', label: 'Dashboard', href: 'admin.html' },
    { id: 'users', icon: 'fa-solid fa-users', label: 'Pengguna', href: 'admin.html#users' },
    { id: 'projects', icon: 'fa-solid fa-folder', label: 'Proyek', href: 'admin.html#projects' },
    { id: 'reports', icon: 'fa-solid fa-flag', label: 'Laporan', href: 'admin.html#reports' },
    { id: 'help', icon: 'fa-solid fa-life-ring', label: 'Bantuan', href: 'admin.html#help' },
    { id: 'settings', icon: 'fa-solid fa-gear', label: 'Pengaturan', href: 'admin.html#settings' },
    { id: 'chat', icon: 'fa-solid fa-globe', label: 'Global Chat', href: 'global-chat.html' },
  ] : [
    { id: 'dashboard', icon: 'fa-solid fa-house', label: 'Beranda', href: 'dashboard.html' },
    { id: 'explore', icon: 'fa-solid fa-compass', label: 'Jelajahi', href: 'explore.html' },
    { id: 'messages', icon: 'fa-solid fa-envelope', label: 'Pesan', href: 'messages.html' },
    { id: 'chat', icon: 'fa-solid fa-globe', label: 'Global Chat', href: 'global-chat.html' },
    { id: 'profile', icon: 'fa-solid fa-user', label: 'Profil', href: 'profile.html?u=' + user?.username },
    { id: 'settings', icon: 'fa-solid fa-gear', label: 'Pengaturan', href: 'settings.html' },
  ];

  const initials = (user?.display_name || user?.username || '?').charAt(0).toUpperCase();
  const avatarSrc = user?.avatar_url
    ? `<img src="${user.avatar_url}" class="avatar avatar-sm" />`
    : `<div class="avatar avatar-sm">${initials}</div>`;

  return `
    <div class="sidebar-logo">
      <div class="sidebar-logo-img" id="sidebar-logo-img">Z</div>
      <div class="sidebar-logo-text">Zyvен<span>qo</span></div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section-label">${isAdmin ? 'Admin Panel' : 'Menu'}</div>
      ${pages.map(p => `
        <a class="nav-item ${activePage === p.id ? 'active' : ''}" href="${p.href}">
          <i class="${p.icon}"></i>
          <span>${p.label}</span>
        </a>`).join('')}
    </nav>
    <div class="sidebar-bottom">
      <div class="sidebar-user" onclick="window.location.href='${isAdmin ? 'admin.html' : 'settings.html'}'">
        ${avatarSrc}
        <div style="flex:1;min-width:0;">
          <div class="truncate" style="font-size:13px;font-weight:600;">${user?.display_name || user?.username}</div>
          <div class="truncate text-xs text-muted">@${user?.username}</div>
        </div>
        <i class="fa-solid fa-ellipsis-vertical text-muted" style="font-size:12px;"></i>
      </div>
    </div>`;
}
