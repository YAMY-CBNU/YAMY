(() => {
  const API_BASE = 'http://localhost:3000/api/auth';

  function ensureStatusBox(form) {
    let box = form.parentElement.querySelector('[data-auth-status]');
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('data-auth-status', '');
      box.className = 'mb-4 rounded-lg border px-4 py-3 text-sm font-medium hidden';
      form.parentElement.insertBefore(box, form);
    }
    return box;
  }

  function setStatus(form, message, type = 'error') {
    const box = ensureStatusBox(form);
    const colors = type === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-red-200 bg-red-50 text-red-800';
    box.className = `mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${colors}`;
    box.textContent = message;
    box.classList.remove('hidden');
  }

  function hideStatus(form) {
    const box = form.parentElement.querySelector('[data-auth-status]');
    if (box) {
      box.classList.add('hidden');
    }
  }

  function getAuthMode() {
    if (document.getElementById('signup-email')) {
      return 'signup';
    }
    if (document.getElementById('login-email')) {
      return 'login';
    }
    return null;
  }

  async function handleLogin(form) {
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value || '';
    const remember = document.getElementById('remember-me')?.checked;

    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '로그인에 실패했습니다.');
    }

    localStorage.setItem('yamy_token', data.token);
    localStorage.setItem('yamy_user', JSON.stringify(data.user));
    window.location.href = 'index.html';
  }

  async function handleSignup(form) {
    const username = document.getElementById('signup-name')?.value.trim();
    const email = document.getElementById('signup-email')?.value.trim();
    const password = document.getElementById('signup-password')?.value || '';
    const passwordConfirm = document.getElementById('signup-password-confirm')?.value || '';
    const agree = document.getElementById('agree-terms')?.checked;

    if (password !== passwordConfirm) {
      throw new Error('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }

    if (!agree) {
      throw new Error('이용약관 및 개인정보 수집 동의가 필요합니다.');
    }

    const response = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: username, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '회원가입에 실패했습니다.');
    }

    localStorage.setItem('yamy_token', data.token);
    localStorage.setItem('yamy_user', JSON.stringify(data.user));
    window.location.href = 'index.html';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const mode = getAuthMode();

    if (!form || !mode) {
      return;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideStatus(form);

      try {
        if (mode === 'login') {
          await handleLogin(form);
        } else {
          await handleSignup(form);
        }
      } catch (error) {
        setStatus(form, error.message || '처리 중 오류가 발생했습니다.');
      }
    });
  });
})();
