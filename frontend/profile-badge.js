(function () {
  // 저장된 유저 정보 / Stored User
  function getStoredUser() {
    const rawUser = window.localStorage.getItem('yamy_user');

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch (error) {
      return null;
    }
  }

  // 로그인 상태 / Auth State
  function isLoggedIn() {
    return Boolean(window.localStorage.getItem('yamy_token'));
  }

  // 프로필 라벨 / Profile Label
  function getProfileLabel(user) {
    const username =
      (typeof user?.username === 'string' && user.username.trim()) ||
      (typeof user?.name === 'string' && user.name.trim()) ||
      '';

    return username ? `${username} 요리사` : '프로필';
  }

  // 로그아웃 / Logout
  function handleLogout(event) {
    event.preventDefault();
    window.localStorage.removeItem('yamy_token');
    window.localStorage.removeItem('yamy_user');
    window.location.href = 'index.html';
  }

  // 네비 UI 업데이트 / Nav UI Update
  function applyAuthUi() {
    const loggedIn = isLoggedIn();
    const label = getProfileLabel(getStoredUser());

    document.querySelectorAll('[data-profile-link]').forEach((link) => {
      const textSpan = link.querySelector('[data-profile-text]');
      if (textSpan) {
        textSpan.textContent = label;
      } else {
        link.textContent = label;
      }
      link.setAttribute('title', label);
      link.setAttribute('aria-label', '프로필로 이동');
      link.classList.toggle('hidden', !loggedIn);
      link.classList.toggle('inline-flex', loggedIn);
      link.classList.toggle('flex', loggedIn && link.dataset.profileLayout === 'flex');
    });

    document.querySelectorAll('[data-logout-button]').forEach((button) => {
      button.classList.toggle('hidden', !loggedIn);
      button.addEventListener('click', handleLogout);
    });

    document.querySelectorAll('#auth-action, [data-auth-action]').forEach((link) => {
      link.textContent = loggedIn ? '로그아웃' : '로그인';
      link.setAttribute('title', loggedIn ? '로그아웃' : '로그인');
      link.setAttribute('href', loggedIn ? '#' : 'login.html');
      link.onclick = loggedIn ? handleLogout : null;
    });

    document.querySelectorAll('#nav-my-recipe').forEach((link) => {
      link.classList.toggle('hidden', !loggedIn);
    });
  }

  // 초기화 / Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAuthUi);
    return;
  }

  applyAuthUi();
})();
