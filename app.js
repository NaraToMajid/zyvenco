// =============================================
// app.js — Shared UI Components & Utilities
// =============================================
import { db, Auth, Settings, timeAgo, linkify, Notif } from './db.js';

// ── THEME ────────────────────────────────────
export function initTheme() {
  const saved = localStorage.getItem('zy_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  return saved;
}

export function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('zy_theme', next);
  return next;
}

// ── TOAST ────────────────────────────────────
export function toast(msg, type = 'info', duration = 3500) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const colors = { success: 'var(--green)', error: 'var(--red)', info: 'var(--accent3)' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type]}" style="color:${colors[type]};flex-shrink:0"></i><span>${msg}</span>`;
  const c = document.getElementById('toast-container');
  if (c) {
    c.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }
}

// ── MODAL ────────────────────────────────────
export function openModal(html, id = 'modal-dyn') {
  closeModal(id);
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.id = id + '-bd';
  bd.innerHTML = `<div class="modal" id="${id}">${html}</div>`;
  bd.addEventListener('click', e => { if (e.target === bd) closeModal(id); });
  document.body.appendChild(bd);
}
export function closeModal(id = 'modal-dyn') {
  const el = document.getElementById(id + '-bd');
  if (el) el.remove();
}

// ── AVATAR ───────────────────────────────────
export function avatarHTML(user, size = 'sm') {
  const sz = { sm: 32, md: 44, lg: 72, xl: 96 }[size] || 32;
  const name = user.display_name || user.username || '?';
  if (user.avatar_url) {
    return `<img src="${user.avatar_url}" class="avatar avatar-${size}" alt="${name}" width="${sz}" height="${sz}">`;
  }
  const initials = name.charAt(0).toUpperCase();
  return `<div class="avatar-placeholder avatar-${size}" style="width:${sz}px;height:${sz}px;font-size:${sz * 0.38}px">${initials}</div>`;
}

// ── SIDEBAR BUILDER ──────────────────────────
export async function buildSidebar(activeNav) {
  const u = Auth.current();
  if (!u) return;

  const logoVal = await Settings.get('site_logo');
  const logoHTML = logoVal
    ? `<img src="${logoVal}" alt="logo" style="width:32px;height:32px;border-radius:8px;object-fit:cover">`
    : `<span style="width:32px;height:32px;background:rgba(108,99,255,.15);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--accent3)"><i class="fa-solid fa-code"></i></span>`;

  const unread = (await Notif.getUnread(u.id)).length;
  const unreadBadge = unread > 0 ? `<span class="badge badge-red" style="font-size:.65rem;padding:.1rem .45rem">${unread}</span>` : '';

  const nav = [
    { icon: 'fa-house', label: 'Dashboard', href: 'dashboard.html', key: 'dashboard' },
    { icon: 'fa-folder', label: 'Proyek Saya', href: 'projects.html', key: 'projects' },
    { icon: 'fa-compass', label: 'Jelajahi', href: 'explore.html', key: 'explore' },
    { icon: 'fa-message', label: 'Pesan', href: 'messages.html', key: 'messages', badge: unreadBadge },
    { icon: 'fa-earth-asia', label: 'Global Chat', href: 'chat.html', key: 'chat' },
    { icon: 'fa-bell', label: 'Notifikasi', href: 'notifications.html', key: 'notifications', badge: unreadBadge },
    { icon: 'fa-flag', label: 'Bantuan / Lapor', href: 'help.html', key: 'help' },
  ];

  const navHTML = nav.map(n =>
    `<a href="${n.href}" class="nav-item ${activeNav === n.key ? 'active' : ''}">
      <i class="fa-solid ${n.icon}"></i>${n.label}${n.badge || ''}
    </a>`
  ).join('');

  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      ${logoHTML}
      <span class="sidebar-brand-name">Zyven<span>qo</span></span>
    </div>
    <nav class="sidebar-nav">
      ${navHTML}
    </nav>
    <div class="sidebar-bottom">
      <div class="flex items-center gap-1" style="padding:.4rem .5rem;border-radius:var(--radius2);background:var(--bg3)">
        ${avatarHTML(u, 'sm')}
        <div style="flex:1;min-width:0">
          <div class="ellipsis" style="font-size:.8rem;font-weight:600">${u.display_name || u.username}</div>
          <div style="font-size:.7rem;color:var(--text3)">@${u.username}</div>
        </div>
        <div class="dropdown">
          <button class="btn btn-ghost btn-icon" id="user-menu-btn" onclick="toggleUserMenu()"><i class="fa-solid fa-ellipsis-vertical"></i></button>
          <div class="dropdown-menu" id="user-menu">
            <a class="dropdown-item" href="profile.html"><i class="fa-solid fa-user"></i>Profil</a>
            <a class="dropdown-item" href="settings.html"><i class="fa-solid fa-gear"></i>Pengaturan</a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" onclick="doThemeToggle()"><i class="fa-solid fa-circle-half-stroke"></i>Toggle Tema</button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item danger" onclick="Auth.logout()"><i class="fa-solid fa-right-from-bracket"></i>Keluar</button>
          </div>
        </div>
      </div>
    </div>`;

  // Mobile overlay
  const overlay = document.getElementById('sidebar-overlay');
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('show');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}

window.toggleUserMenu = function () {
  document.getElementById('user-menu').classList.toggle('open');
  document.addEventListener('click', e => {
    if (!e.target.closest('#user-menu-btn') && !e.target.closest('#user-menu')) {
      document.getElementById('user-menu')?.classList.remove('open');
    }
  }, { once: true });
};

window.doThemeToggle = function () {
  const t = toggleTheme();
  const icon = t === 'dark' ? 'fa-sun' : 'fa-moon';
  const btn = document.getElementById('topbar-theme');
  if (btn) btn.innerHTML = `<i class="fa-solid ${icon}"></i>`;
};

// ── CONFIRM DIALOG ───────────────────────────
export function confirm2(msg, onYes, danger = true) {
  openModal(`
    <div class="modal-header"><h3><i class="fa-solid fa-triangle-exclamation" style="color:var(--yellow)"></i> Konfirmasi</h3>
      <button class="btn btn-ghost btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <p style="margin-bottom:1.25rem">${msg}</p>
    <div class="flex gap-1 justify-end">
      <button class="btn btn-outline btn-sm" onclick="closeModal()">Batal</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" id="confirm-yes">Ya, Lanjutkan</button>
    </div>
  `);
  document.getElementById('confirm-yes').onclick = () => { closeModal(); onYes(); };
}

window.closeModal = (id) => {
  const el = document.getElementById((id || 'modal-dyn') + '-bd');
  if (el) el.remove();
  // fallback: remove any backdrop
  document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
};

// ── LANG ICON ────────────────────────────────
export function langIcon(name) {
  const map = {
    js: 'fa-js text-yellow', ts: 'fa-code text-cyan',
    py: 'fa-python text-accent', html: 'fa-html5 text-red',
    css: 'fa-css3-alt text-accent', json: 'fa-brackets-curly text-yellow',
    md: 'fa-markdown text-text2', txt: 'fa-file-lines text-text3',
    img: 'fa-image text-green', default: 'fa-file-code text-text3'
  };
  const ext = (name || '').split('.').pop().toLowerCase();
  return map[ext] || map.default;
}

export { Auth, db, timeAgo, linkify };
