/**
 * CraftMatrix Pro Authentication & Role-Based Access Control (RBAC) Module
 */

import { db, USER_ROLES } from '../store/db.js';
import { showToast, playSound, openModal, closeModal, generateId } from '../utils/helpers.js';

const AUTH_STORAGE_KEY = 'craftmatrix_auth_session';
const IDLE_LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity triggers lock

let currentUser = null;
let currentPinBuffer = '';
let lockPinBuffer = '';
let selectedPinUser = null;
let idleTimer = null;

export function initAuthModule() {
  setupEventListeners();
  setupPinPad();
  setupLockScreen();
  setupStaffManagement();
  setupIdleWatcher();

  // Validate existing stored session
  restoreSession();
}

/**
 * Check if a session exists in localStorage and validate against db
 */
function restoreSession() {
  const sessionRaw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (sessionRaw) {
    try {
      const sessionData = JSON.parse(sessionRaw);
      const user = db.getUserById(sessionData.userId);
      if (user && user.active) {
        applySession(user, false);
        return;
      }
    } catch (e) {
      console.warn('Invalid session format, clearing', e);
    }
  }

  // If no valid session, present the Auth Gateway
  showAuthOverlay();
}

/**
 * Display the full-screen authentication gateway
 */
export function showAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) {
    overlay.classList.add('open');
    renderDemoUserChips();
    resetPinPad();
  }
}

/**
 * Hide the authentication gateway
 */
export function hideAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) {
    overlay.classList.remove('open');
  }
}

/**
 * Set active user session and enforce role permissions
 */
export function applySession(user, showGreeting = true) {
  currentUser = user;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    userId: user.id,
    timestamp: Date.now()
  }));

  hideAuthOverlay();
  hideLockOverlay();
  updateHeaderUserProfile();
  updateSidebarPermissions();

  const roleConfig = getUserRoleConfig(user.role);

  // If current active tab is not allowed, redirect to user's default home tab
  const activeNav = document.querySelector('.sidebar-nav .nav-item.active');
  const currentActiveTab = activeNav ? activeNav.dataset.tab : 'dashboard';

  if (!canAccessTab(currentActiveTab)) {
    const defaultNav = document.getElementById(`nav-${roleConfig.defaultTab}`);
    if (defaultNav) {
      defaultNav.click();
    }
  }

  if (showGreeting) {
    playSound('success');
    showToast(`Signed in as ${user.name} (${roleConfig.name})`, 'success');
  }

  resetIdleTimer();

  // Dispatch global custom event for other modules
  window.dispatchEvent(new CustomEvent('auth:session-changed', { detail: { user } }));
}

/**
 * Terminate user session
 */
export function logout() {
  playSound('click');
  currentUser = null;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  clearTimeout(idleTimer);
  showToast('Logged out successfully', 'info');
  showAuthOverlay();
}

/**
 * Lock the terminal (quick privacy mode for POS / bar counters)
 */
export function lockTerminal() {
  if (!currentUser) return;
  playSound('click');
  lockPinBuffer = '';
  updateLockDots();
  const lockOverlay = document.getElementById('terminal-lock-overlay');
  if (lockOverlay) {
    const avatar = document.getElementById('lock-user-avatar');
    const name = document.getElementById('lock-user-name');
    const role = document.getElementById('lock-user-role');

    if (avatar) avatar.textContent = currentUser.avatar || '👤';
    if (name) name.textContent = currentUser.name;
    if (role) {
      const cfg = getUserRoleConfig(currentUser.role);
      role.textContent = `${currentUser.title || cfg.name}`;
    }

    lockOverlay.classList.add('open');
  }
}

export function hideLockOverlay() {
  const lockOverlay = document.getElementById('terminal-lock-overlay');
  if (lockOverlay) {
    lockOverlay.classList.remove('open');
  }
}

/**
 * Get role configuration
 */
export function getUserRoleConfig(roleId) {
  const key = (roleId || '').toUpperCase();
  return USER_ROLES[key] || USER_ROLES.ADMIN;
}

/**
 * Check if the active user can access a specific tab
 */
export function canAccessTab(tabId) {
  if (!currentUser) return false;
  const cfg = getUserRoleConfig(currentUser.role);
  if (!cfg || !cfg.allowedTabs) return true;
  return cfg.allowedTabs.includes(tabId);
}

/**
 * Update sidebar items based on current permissions
 */
export function updateSidebarPermissions() {
  if (!currentUser) return;
  const cfg = getUserRoleConfig(currentUser.role);
  const allowed = cfg.allowedTabs || [];

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    const tabId = item.dataset.tab;
    if (!tabId) return;

    // Remove existing restricted markers
    item.classList.remove('nav-restricted');
    const existingLock = item.querySelector('.nav-lock-indicator');
    if (existingLock) existingLock.remove();

    if (!allowed.includes(tabId)) {
      item.classList.add('nav-restricted');
      const lockIcon = document.createElement('span');
      lockIcon.className = 'nav-lock-indicator';
      lockIcon.innerHTML = '🔒';
      lockIcon.title = `Restricted to higher role elevation (${tabId})`;
      item.appendChild(lockIcon);
    }
  });
}

/**
 * Update the user profile chip in the top header
 */
function updateHeaderUserProfile() {
  const container = document.getElementById('header-user-profile');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-header-login">
        <span>🔑 Sign In</span>
      </button>
    `;
    const btn = document.getElementById('btn-header-login');
    if (btn) btn.addEventListener('click', showAuthOverlay);
    return;
  }

  const roleConfig = getUserRoleConfig(currentUser.role);

  container.innerHTML = `
    <div class="user-chip-dropdown-wrapper">
      <button class="user-profile-chip" id="user-profile-menu-btn" title="Click for user options &amp; terminal lock">
        <div class="user-avatar-badge" style="background: ${currentUser.color || 'var(--accent-primary)'};">
          ${currentUser.avatar || '👤'}
        </div>
        <div class="user-info-text">
          <span class="user-display-name">${currentUser.name}</span>
          <span class="user-role-badge ${roleConfig.badgeClass}">${currentUser.title || roleConfig.name}</span>
        </div>
        <span class="dropdown-chevron">▾</span>
      </button>

      <div class="user-dropdown-menu" id="user-dropdown-menu">
        <div class="dropdown-header">
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">${currentUser.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${currentUser.email}</div>
          <div style="margin-top: 0.35rem;">
            <span class="badge ${roleConfig.badgeClass}" style="font-size: 0.7rem;">${roleConfig.name}</span>
          </div>
        </div>
        
        <div class="dropdown-divider"></div>

        <button class="dropdown-item" id="menu-lock-terminal">
          <span>🔒</span>
          <span>Lock Terminal</span>
          <kbd class="kbd-shortcut">Alt+L</kbd>
        </button>
        <button class="dropdown-item" id="menu-switch-user">
          <span>👥</span>
          <span>Switch User / PIN</span>
        </button>
        
        ${roleConfig.canManageUsers ? `
        <button class="dropdown-item" id="menu-staff-mgmt">
          <span>⚙️</span>
          <span>Manage Team &amp; Roles</span>
        </button>
        ` : ''}

        <div class="dropdown-divider"></div>

        <button class="dropdown-item danger" id="menu-logout">
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  `;

  // Attach dropdown toggle & items
  const menuBtn = document.getElementById('user-profile-menu-btn');
  const dropdown = document.getElementById('user-dropdown-menu');

  if (menuBtn && dropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-chip-dropdown-wrapper')) {
        dropdown.classList.remove('open');
      }
    });
  }

  const lockBtn = document.getElementById('menu-lock-terminal');
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      dropdown.classList.remove('open');
      lockTerminal();
    });
  }

  const switchBtn = document.getElementById('menu-switch-user');
  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      dropdown.classList.remove('open');
      showAuthOverlay();
    });
  }

  const staffBtn = document.getElementById('menu-staff-mgmt');
  if (staffBtn) {
    staffBtn.addEventListener('click', () => {
      dropdown.classList.remove('open');
      openStaffManagementModal();
    });
  }

  const logoutBtn = document.getElementById('menu-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      dropdown.classList.remove('open');
      logout();
    });
  }
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
  // Shortcut: Alt+L to lock terminal
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      lockTerminal();
    }
  });

  // Tab switching interception in sidebar
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const tabId = item.dataset.tab;
      if (!tabId) return;

      if (!canAccessTab(tabId)) {
        e.stopImmediatePropagation();
        e.preventDefault();
        playSound('denied');
        const role = currentUser ? getUserRoleConfig(currentUser.role).name : 'Staff';
        showToast(`Access Restricted: "${tabId.toUpperCase()}" requires elevated privileges. (${role} does not have clearance)`, 'error', 4000);
      }
    }, true); // Capture phase to intercept before app.js navigation
  });

  // Auth Overlay Mode Tabs (PIN Pad vs Password)
  const tabPin = document.getElementById('auth-tab-pin');
  const tabPass = document.getElementById('auth-tab-pass');
  const panePin = document.getElementById('auth-pane-pin');
  const panePass = document.getElementById('auth-pane-pass');

  if (tabPin && tabPass && panePin && panePass) {
    tabPin.addEventListener('click', () => {
      playSound('click');
      tabPin.classList.add('active');
      tabPass.classList.remove('active');
      panePin.classList.add('active');
      panePass.classList.remove('active');
      resetPinPad();
    });

    tabPass.addEventListener('click', () => {
      playSound('click');
      tabPass.classList.add('active');
      tabPin.classList.remove('active');
      panePass.classList.add('active');
      panePin.classList.remove('active');
    });
  }

  // Password Login Form Submit
  const passForm = document.getElementById('password-login-form');
  if (passForm) {
    passForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const identifier = document.getElementById('login-identifier').value;
      const password = document.getElementById('login-password').value;

      if (!identifier || !password) {
        showToast('Please enter both username/email and password', 'error');
        return;
      }

      const user = db.getUserByUsernameOrEmail(identifier);
      if (!user) {
        playSound('error');
        showToast('No user account found with this identifier', 'error');
        return;
      }

      if (user.password !== password) {
        playSound('error');
        showToast('Invalid password', 'error');
        return;
      }

      if (!user.active) {
        playSound('error');
        showToast('This account has been deactivated by the manager', 'error');
        return;
      }

      applySession(user);
    });
  }
}

/**
 * Render Demo Quick-Switch Employee Chips
 */
function renderDemoUserChips() {
  const container = document.getElementById('demo-users-chips-container');
  if (!container) return;

  const users = db.getUsers().filter(u => u.active);
  container.innerHTML = users.map(u => {
    const roleCfg = getUserRoleConfig(u.role);
    const isSelected = selectedPinUser && selectedPinUser.id === u.id;
    return `
      <button type="button" class="demo-user-chip ${isSelected ? 'selected' : ''}" data-user-id="${u.id}" title="Click to instantly switch/log in as ${u.name}">
        <span class="demo-user-avatar" style="background: ${u.color || '#f59e0b'};">${u.avatar || '👤'}</span>
        <div class="demo-user-details">
          <div class="demo-user-name">${u.name}</div>
          <div class="demo-user-sub">${u.title || roleCfg.name} • PIN: <strong class="mono-font">${u.pin}</strong></div>
        </div>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.demo-user-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const userId = btn.dataset.userId;
      const user = db.getUserById(userId);
      if (user) {
        playSound('tap');
        applySession(user);
      }
    });
  });
}

/**
 * Setup the interactive POS PIN Pad
 */
function setupPinPad() {
  const pinKeys = document.querySelectorAll('.pin-keypad .pin-btn');
  const errorMsg = document.getElementById('pin-error-msg');

  pinKeys.forEach(btn => {
    btn.addEventListener('click', () => {
      const digit = btn.dataset.digit;
      const action = btn.dataset.action;

      if (digit !== undefined) {
        playSound('tap');
        if (currentPinBuffer.length < 4) {
          currentPinBuffer += digit;
          updatePinDots();
          if (errorMsg) errorMsg.textContent = '';

          if (currentPinBuffer.length === 4) {
            // Auto submit when 4th digit entered
            setTimeout(() => verifyPinInput(), 100);
          }
        }
      } else if (action === 'backspace') {
        playSound('click');
        if (currentPinBuffer.length > 0) {
          currentPinBuffer = currentPinBuffer.slice(0, -1);
          updatePinDots();
        }
      } else if (action === 'clear') {
        playSound('click');
        resetPinPad();
      }
    });
  });

  // Support physical keyboard numbers when auth overlay is open
  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('auth-overlay');
    if (!overlay || !overlay.classList.contains('open')) return;

    // Check if password pane is active
    const passPane = document.getElementById('auth-pane-pass');
    if (passPane && passPane.classList.contains('active')) return;

    if (e.key >= '0' && e.key <= '9') {
      playSound('tap');
      if (currentPinBuffer.length < 4) {
        currentPinBuffer += e.key;
        updatePinDots();
        if (currentPinBuffer.length === 4) {
          setTimeout(() => verifyPinInput(), 100);
        }
      }
    } else if (e.key === 'Backspace') {
      if (currentPinBuffer.length > 0) {
        currentPinBuffer = currentPinBuffer.slice(0, -1);
        updatePinDots();
      }
    } else if (e.key === 'Escape') {
      resetPinPad();
    }
  });
}

function updatePinDots() {
  const dots = document.querySelectorAll('#auth-pin-dots .pin-dot');
  dots.forEach((dot, idx) => {
    if (idx < currentPinBuffer.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
}

function resetPinPad() {
  currentPinBuffer = '';
  updatePinDots();
  const errorMsg = document.getElementById('pin-error-msg');
  if (errorMsg) errorMsg.textContent = '';
}

function verifyPinInput() {
  const errorMsg = document.getElementById('pin-error-msg');
  const user = db.getUserByPin(currentPinBuffer);

  if (user) {
    playSound('success');
    applySession(user);
  } else {
    playSound('denied');
    if (errorMsg) errorMsg.textContent = 'Invalid 4-digit PIN. Try again or select a demo user.';
    
    // Shake animation
    const container = document.getElementById('auth-pin-dots');
    if (container) {
      container.classList.add('shake');
      setTimeout(() => container.classList.remove('shake'), 500);
    }
    
    currentPinBuffer = '';
    updatePinDots();
  }
}

/**
 * Setup the Lock Screen Overlay
 */
function setupLockScreen() {
  const lockKeys = document.querySelectorAll('.lock-keypad .pin-btn');
  const errorMsg = document.getElementById('lock-pin-error-msg');

  lockKeys.forEach(btn => {
    btn.addEventListener('click', () => {
      const digit = btn.dataset.digit;
      const action = btn.dataset.action;

      if (digit !== undefined) {
        playSound('tap');
        if (lockPinBuffer.length < 4) {
          lockPinBuffer += digit;
          updateLockDots();
          if (errorMsg) errorMsg.textContent = '';

          if (lockPinBuffer.length === 4) {
            setTimeout(() => verifyLockPin(), 100);
          }
        }
      } else if (action === 'backspace') {
        playSound('click');
        if (lockPinBuffer.length > 0) {
          lockPinBuffer = lockPinBuffer.slice(0, -1);
          updateLockDots();
        }
      } else if (action === 'clear') {
        playSound('click');
        lockPinBuffer = '';
        updateLockDots();
      }
    });
  });

  const switchUserBtn = document.getElementById('btn-lock-switch-user');
  if (switchUserBtn) {
    switchUserBtn.addEventListener('click', () => {
      hideLockOverlay();
      showAuthOverlay();
    });
  }

  // Support physical numpad for unlocking
  document.addEventListener('keydown', (e) => {
    const lockOverlay = document.getElementById('terminal-lock-overlay');
    if (!lockOverlay || !lockOverlay.classList.contains('open')) return;

    if (e.key >= '0' && e.key <= '9') {
      playSound('tap');
      if (lockPinBuffer.length < 4) {
        lockPinBuffer += e.key;
        updateLockDots();
        if (lockPinBuffer.length === 4) {
          setTimeout(() => verifyLockPin(), 100);
        }
      }
    } else if (e.key === 'Backspace') {
      if (lockPinBuffer.length > 0) {
        lockPinBuffer = lockPinBuffer.slice(0, -1);
        updateLockDots();
      }
    }
  });
}

function updateLockDots() {
  const dots = document.querySelectorAll('#lock-pin-dots .pin-dot');
  dots.forEach((dot, idx) => {
    if (idx < lockPinBuffer.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
}

function verifyLockPin() {
  const errorMsg = document.getElementById('lock-pin-error-msg');

  if (currentUser && currentUser.pin === lockPinBuffer) {
    playSound('success');
    hideLockOverlay();
    lockPinBuffer = '';
    updateLockDots();
    resetIdleTimer();
    showToast(`Welcome back, ${currentUser.name}`, 'info');
  } else {
    // Check if another user entered their PIN to unlock & switch
    const otherUser = db.getUserByPin(lockPinBuffer);
    if (otherUser) {
      playSound('success');
      lockPinBuffer = '';
      updateLockDots();
      applySession(otherUser);
      return;
    }

    playSound('denied');
    if (errorMsg) errorMsg.textContent = 'Incorrect PIN code';
    const container = document.getElementById('lock-pin-dots');
    if (container) {
      container.classList.add('shake');
      setTimeout(() => container.classList.remove('shake'), 500);
    }
    lockPinBuffer = '';
    updateLockDots();
  }
}

/**
 * Idle watcher: automatically locks terminal after inactivity
 */
function setupIdleWatcher() {
  ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
    document.addEventListener(evt, () => resetIdleTimer(), { passive: true });
  });
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (currentUser) {
    idleTimer = setTimeout(() => {
      const lockOverlay = document.getElementById('terminal-lock-overlay');
      const authOverlay = document.getElementById('auth-overlay');
      if ((!lockOverlay || !lockOverlay.classList.contains('open')) && 
          (!authOverlay || !authOverlay.classList.contains('open'))) {
        lockTerminal();
        showToast('Terminal auto-locked due to inactivity', 'info');
      }
    }, IDLE_LOCK_TIMEOUT_MS);
  }
}

/**
 * Staff User Management Modal
 */
function setupStaffManagement() {
  const form = document.getElementById('staff-add-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('staff-form-name').value.trim();
      const title = document.getElementById('staff-form-title').value.trim();
      const role = document.getElementById('staff-form-role').value;
      const pin = document.getElementById('staff-form-pin').value.trim();
      const email = document.getElementById('staff-form-email').value.trim();
      const password = document.getElementById('staff-form-password').value.trim() || 'password123';

      if (!name || !role || !pin) {
        showToast('Please fill out Name, Role, and a 4-Digit PIN', 'error');
        return;
      }

      if (!/^\d{4}$/.test(pin)) {
        showToast('PIN must be exactly 4 numeric digits', 'error');
        return;
      }

      // Check for PIN conflict
      const existing = db.getUserByPin(pin);
      if (existing) {
        showToast(`PIN ${pin} is already assigned to ${existing.name}. Choose another.`, 'error');
        return;
      }

      const roleCfg = getUserRoleConfig(role);
      let avatar = '👤';
      let color = '#3b82f6';
      if (role === 'admin') { avatar = '👑'; color = '#f59e0b'; }
      if (role === 'brewer') { avatar = '🍺'; color = '#eab308'; }
      if (role === 'chef') { avatar = '👨‍🍳'; color = '#10b981'; }
      if (role === 'bartender') { avatar = '🍸'; color = '#06b6d4'; }
      if (role === 'inventory') { avatar = '📋'; color = '#a855f7'; }

      const newUser = {
        id: generateId('usr'),
        name,
        title: title || roleCfg.name,
        role,
        pin,
        email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@vkcontrols.local`,
        username: name.toLowerCase().replace(/\s+/g, ''),
        password,
        avatar,
        color,
        active: true
      };

      db.saveUser(newUser);
      showToast(`Team member "${name}" added successfully!`, 'success');
      form.reset();
      renderStaffTable();
      renderDemoUserChips();
    });
  }
}

export function openStaffManagementModal() {
  if (!currentUser) return;
  const cfg = getUserRoleConfig(currentUser.role);
  if (!cfg.canManageUsers) {
    showToast('Only General Managers & Admins can access Staff Management', 'error');
    return;
  }

  renderStaffTable();
  openModal('user-mgmt-modal');
}

function renderStaffTable() {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;

  const users = db.getUsers();
  tbody.innerHTML = users.map(u => {
    const roleCfg = getUserRoleConfig(u.role);
    const isSelf = currentUser && currentUser.id === u.id;
    const isPrimaryAdmin = u.id === 'usr_admin';

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${u.color || '#f59e0b'}; display: flex; align-items: center; justify-content: center; font-size: 1rem;">
              ${u.avatar || '👤'}
            </div>
            <div>
              <div style="font-weight: 600; color: var(--text-primary);">${u.name} ${isSelf ? '<span style="color: var(--accent-primary-light); font-size: 0.75rem;">(You)</span>' : ''}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${u.email}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${roleCfg.badgeClass}">${roleCfg.name}</span>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">${u.title || ''}</div>
        </td>
        <td class="mono-font" style="font-weight: 700; letter-spacing: 2px; color: var(--accent-primary-light);">
          ${u.pin}
        </td>
        <td>
          <span class="badge badge-success">Active</span>
        </td>
        <td>
          ${!isPrimaryAdmin && !isSelf ? `
            <button class="btn btn-secondary btn-sm btn-delete-user" data-user-id="${u.id}" style="color: var(--status-danger); border-color: rgba(239, 68, 68, 0.3);">
              🗑️ Delete
            </button>
          ` : `
            <span style="font-size: 0.75rem; color: var(--text-muted);">Protected</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.userId;
      const targetUser = db.getUserById(id);
      if (targetUser && confirm(`Are you sure you want to remove ${targetUser.name} from staff?`)) {
        db.deleteUser(id);
        playSound('click');
        showToast(`User ${targetUser.name} removed`, 'info');
        renderStaffTable();
        renderDemoUserChips();
      }
    });
  });
}
