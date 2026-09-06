// ==========================================
// CleanGo - Login & Register JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initLoginForm();
  initRegisterForm();
  initPasswordToggles();
  initPasswordStrength();
  animateStats();
  checkUrlParams();
});

// ==========================================
// Tab Switcher
// ==========================================
function initTabs() {
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const indicator = document.getElementById('tabIndicator');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const subtitle = document.getElementById('appSubtitle');
  const alertContainer = document.getElementById('alertContainer');

  // Also handle the switch links at bottom of forms
  const goToRegister = document.getElementById('goToRegister');
  const goToLogin = document.getElementById('goToLogin');

  function switchToTab(tab) {
    alertContainer.innerHTML = '';
    clearAllErrors();

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      indicator.classList.remove('right');
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
      subtitle.textContent = 'Selamat datang kembali!';

      // Re-trigger animation
      loginForm.style.animation = 'none';
      loginForm.offsetHeight; // reflow
      loginForm.style.animation = 'formIn 0.4s ease';
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      indicator.classList.add('right');
      registerForm.style.display = 'flex';
      loginForm.style.display = 'none';
      subtitle.textContent = 'Buat akun baru, gratis!';

      registerForm.style.animation = 'none';
      registerForm.offsetHeight;
      registerForm.style.animation = 'formIn 0.4s ease';
    }
  }

  tabLogin.addEventListener('click', () => switchToTab('login'));
  tabRegister.addEventListener('click', () => switchToTab('register'));
  goToRegister.addEventListener('click', (e) => { e.preventDefault(); switchToTab('register'); });
  goToLogin.addEventListener('click', (e) => { e.preventDefault(); switchToTab('login'); });

  // Check URL hash
  if (window.location.hash === '#register') {
    switchToTab('register');
  }
}

// ==========================================
// Login Form
// ==========================================
function initLoginForm() {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');

  emailInput.addEventListener('blur', () => validateField(emailInput, 'loginEmailGroup', 'loginEmailError', 'email'));
  passwordInput.addEventListener('blur', () => validateField(passwordInput, 'loginPasswordGroup', 'loginPasswordError', 'password'));
  emailInput.addEventListener('input', () => clearFieldError('loginEmailGroup', 'loginEmailError'));
  passwordInput.addEventListener('input', () => clearFieldError('loginPasswordGroup', 'loginPasswordError'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailValid = validateField(emailInput, 'loginEmailGroup', 'loginEmailError', 'email');
    const passValid = validateField(passwordInput, 'loginPasswordGroup', 'loginPasswordError', 'password');

    if (!emailValid || !passValid) return;

    const btn = document.getElementById('loginBtn');
    setButtonLoading(btn, true);

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value
        })
      });
      const data = await res.json();

      if (data.success) {
        showAlert('success', 'Login berhasil! Mengalihkan...');
        setTimeout(() => { window.location.href = data.redirect || '/dashboard'; }, 800);
      } else {
        showAlert('error', data.message || 'Login gagal. Silakan coba lagi.');
        setButtonLoading(btn, false);
      }
    } catch (err) {
      showAlert('error', 'Kesalahan jaringan. Silakan coba lagi.');
      setButtonLoading(btn, false);
    }
  });
}

// ==========================================
// Register Form
// ==========================================
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  const nameInput = document.getElementById('regName');
  const emailInput = document.getElementById('regEmail');
  const passwordInput = document.getElementById('regPassword');
  const confirmInput = document.getElementById('regConfirm');

  nameInput.addEventListener('blur', () => validateField(nameInput, 'regNameGroup', 'regNameError', 'name'));
  emailInput.addEventListener('blur', () => validateField(emailInput, 'regEmailGroup', 'regEmailError', 'email'));
  passwordInput.addEventListener('blur', () => validateField(passwordInput, 'regPasswordGroup', 'regPasswordError', 'regPassword'));
  confirmInput.addEventListener('blur', () => validateConfirm());

  nameInput.addEventListener('input', () => clearFieldError('regNameGroup', 'regNameError'));
  emailInput.addEventListener('input', () => clearFieldError('regEmailGroup', 'regEmailError'));
  passwordInput.addEventListener('input', () => clearFieldError('regPasswordGroup', 'regPasswordError'));
  confirmInput.addEventListener('input', () => clearFieldError('regConfirmGroup', 'regConfirmError'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameValid = validateField(nameInput, 'regNameGroup', 'regNameError', 'name');
    const emailValid = validateField(emailInput, 'regEmailGroup', 'regEmailError', 'email');
    const passValid = validateField(passwordInput, 'regPasswordGroup', 'regPasswordError', 'regPassword');
    const confirmValid = validateConfirm();

    if (!nameValid || !emailValid || !passValid || !confirmValid) return;

    const btn = document.getElementById('registerBtn');
    setButtonLoading(btn, true);

    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          password: passwordInput.value,
          confirmPassword: confirmInput.value
        })
      });
      const data = await res.json();

      if (data.success) {
        showAlert('success', data.message || 'Registrasi berhasil!');
        setTimeout(() => { window.location.href = data.redirect || '/login?registered=true'; }, 800);
      } else {
        showAlert('error', data.message || 'Registrasi gagal.');
        setButtonLoading(btn, false);
      }
    } catch (err) {
      showAlert('error', 'Kesalahan jaringan. Silakan coba lagi.');
      setButtonLoading(btn, false);
    }
  });
}

// ==========================================
// Validation
// ==========================================
function validateField(input, groupId, errorId, type) {
  const value = input.value.trim();
  const group = document.getElementById(groupId);
  const errorEl = document.getElementById(errorId);

  if (!value) {
    const labels = { email: 'Email', password: 'Password', name: 'Nama lengkap', regPassword: 'Password' };
    setFieldError(group, errorEl, `${labels[type] || 'Field'} harus diisi`);
    return false;
  }

  if (type === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFieldError(group, errorEl, 'Format email tidak valid');
      return false;
    }
  }

  if (type === 'password' && value.length < 6) {
    setFieldError(group, errorEl, 'Password minimal 6 karakter');
    return false;
  }

  if (type === 'regPassword' && value.length < 8) {
    setFieldError(group, errorEl, 'Password minimal 8 karakter');
    return false;
  }

  if (type === 'name' && value.length < 2) {
    setFieldError(group, errorEl, 'Nama minimal 2 karakter');
    return false;
  }

  clearFieldError(groupId, errorId);
  return true;
}

function validateConfirm() {
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const group = document.getElementById('regConfirmGroup');
  const errorEl = document.getElementById('regConfirmError');

  if (!confirm) {
    setFieldError(group, errorEl, 'Konfirmasi password harus diisi');
    return false;
  }
  if (password !== confirm) {
    setFieldError(group, errorEl, 'Password tidak cocok');
    return false;
  }

  clearFieldError('regConfirmGroup', 'regConfirmError');
  return true;
}

function setFieldError(group, errorEl, message) {
  group.classList.add('has-error', 'shake');
  errorEl.textContent = message;
  setTimeout(() => group.classList.remove('shake'), 450);
}

function clearFieldError(groupId, errorId) {
  document.getElementById(groupId).classList.remove('has-error');
  document.getElementById(errorId).textContent = '';
}

function clearAllErrors() {
  document.querySelectorAll('.field-group').forEach(g => g.classList.remove('has-error', 'shake'));
  document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
}

// ==========================================
// Password Strength Indicator
// ==========================================
function initPasswordStrength() {
  const input = document.getElementById('regPassword');
  const strengthContainer = document.getElementById('passwordStrength');
  const fill = document.getElementById('strengthFill');
  const text = document.getElementById('strengthText');

  input.addEventListener('input', () => {
    const val = input.value;

    if (!val) {
      strengthContainer.classList.remove('visible');
      return;
    }

    strengthContainer.classList.add('visible');

    let score = 0;
    if (val.length >= 8) score++;
    if (val.length >= 12) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    fill.className = 'strength-fill';
    text.className = 'strength-text';

    if (score <= 1) {
      fill.classList.add('weak');
      text.classList.add('weak');
      text.textContent = 'Lemah';
    } else if (score === 2) {
      fill.classList.add('fair');
      text.classList.add('fair');
      text.textContent = 'Cukup';
    } else if (score === 3) {
      fill.classList.add('good');
      text.classList.add('good');
      text.textContent = 'Bagus';
    } else {
      fill.classList.add('strong');
      text.classList.add('strong');
      text.textContent = 'Kuat';
    }
  });
}

// ==========================================
// Password Toggle
// ==========================================
function initPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const eyeOpen = btn.querySelector('.icon-eye-open');
      const eyeClosed = btn.querySelector('.icon-eye-closed');

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      eyeOpen.style.display = isPassword ? 'none' : 'block';
      eyeClosed.style.display = isPassword ? 'block' : 'none';
    });
  });
}

// ==========================================
// Button Loading State
// ==========================================
function setButtonLoading(btn, loading) {
  const label = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  label.style.display = loading ? 'none' : 'inline';
  spinner.style.display = loading ? 'flex' : 'none';
}

// ==========================================
// Alert Messages
// ==========================================
function showAlert(type, message) {
  const container = document.getElementById('alertContainer');

  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
  };

  container.innerHTML = `
    <div class="alert alert-${type}">
      ${icons[type] || ''}
      <span>${message}</span>
    </div>
  `;

  if (type === 'error') {
    setTimeout(() => {
      const el = container.querySelector('.alert');
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-6px)';
        setTimeout(() => container.innerHTML = '', 300);
      }
    }, 5000);
  }
}

// ==========================================
// Stats Counter Animation
// ==========================================
function animateStats() {
  document.querySelectorAll('.stat-value').forEach(el => {
    const target = parseFloat(el.getAttribute('data-target'));
    const isFloat = target % 1 !== 0;
    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const current = ease * target;
      el.textContent = isFloat ? current.toFixed(1) : Math.round(current).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

// ==========================================
// URL Params Check
// ==========================================
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const registeredEmail = params.get('email');

  if (registeredEmail) {
    const emailInput = document.getElementById('loginEmail');
    emailInput.value = registeredEmail;
    emailInput.focus();
  }

  if (params.get('error') === 'google_not_configured') {
    setTimeout(() => showAlert('error', 'Login Google belum dikonfigurasi oleh administrator.'), 400);
  } else if (params.get('error') === 'google_auth_failed') {
    setTimeout(() => showAlert('error', 'Login dengan Google gagal. Pastikan akun dan callback URL sudah diizinkan.'), 400);
  }
  if (params.get('registered') === 'true') {
    setTimeout(() => showAlert('success', 'Registrasi berhasil! Masukkan password untuk login.'), 400);
  }
}
