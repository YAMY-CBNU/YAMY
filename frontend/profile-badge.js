(function () {
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

  function isLoggedIn() {
    return Boolean(window.localStorage.getItem('yamy_token'));
  }

  function getProfileLabel(user) {
    const username =
      (typeof user?.username === 'string' && user.username.trim()) ||
      (typeof user?.name === 'string' && user.name.trim()) ||
      '';

    return username ? `${username} \uC694\uB9AC\uC0AC` : '\uD504\uB85C\uD544';
  }

  function handleLogout(event) {
    event.preventDefault();
    window.localStorage.removeItem('yamy_token');
    window.localStorage.removeItem('yamy_user');
    window.location.href = 'index.html';
  }

  function applyAuthUi() {
    const loggedIn = isLoggedIn();
    const label = getProfileLabel(getStoredUser());

    document.querySelectorAll('[data-profile-link]').forEach((link) => {
      link.textContent = label;
      link.setAttribute('title', label);
      link.setAttribute('aria-label', '\uD504\uB85C\uD544\uB85C \uC774\uB3D9');
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAuthUi);
    return;
  }

  applyAuthUi();
})();
