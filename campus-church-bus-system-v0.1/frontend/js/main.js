import { authStorage } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  checkRoutePermissions();
});

/**
 * Update navbar user profile, active links, and logout handler
 */
export function setupNavbar() {
  const userContainer = document.getElementById('nav-user-container');
  const user = authStorage.getUser();

  if (userContainer) {
    if (user) {
      userContainer.innerHTML = `
        <span class="user-badge">
          👤 ${escapeHtml(user.name)} (${user.role.toUpperCase()})
        </span>
        <button id="logout-btn" class="btn btn-outline btn-sm">Log Out</button>
      `;

      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          authStorage.clearAuth();
          window.location.href = '/login.html';
        });
      }
    } else {
      userContainer.innerHTML = `
        <a href="/login.html" class="btn btn-outline btn-sm">Sign In</a>
        <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
      `;
    }
  }

  // Highlight active link based on current path
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
}

/**
 * Route protection checks
 */
function checkRoutePermissions() {
  const path = window.location.pathname;
  const isAuth = authStorage.isAuthenticated();
  const isAdmin = authStorage.isAdmin();

  // Admin routes protection
  if (path.includes('/admin/')) {
    if (!isAuth) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(path)}`;
      return;
    }
    if (!isAdmin) {
      alert('Access Denied. Administrator privileges are required.');
      window.location.href = '/student/dashboard.html';
      return;
    }
  }

  // Student routes protection
  if (path.includes('/student/')) {
    if (!isAuth) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(path)}`;
      return;
    }
  }
}

/**
 * UI Alert Helper
 */
export function showAlert(containerId, message, type = 'info') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${type}">
      <span>${type === 'danger' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span>
      <div>${message}</div>
    </div>
  `;
}

export function clearAlert(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

/**
 * HTML Escaping utility to prevent XSS
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
