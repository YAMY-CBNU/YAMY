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

  function getProfileLabel(user) {
    const username =
      (typeof user?.username === 'string' && user.username.trim()) ||
      (typeof user?.name === 'string' && user.name.trim()) ||
      '';

    return username ? `${username} 요리사` : '프로필';
  }

  function applyProfileLabel() {
    const label = getProfileLabel(getStoredUser());

    document.querySelectorAll('[data-profile-link]').forEach((link) => {
      link.textContent = label;
      link.setAttribute('title', label);
      link.setAttribute('aria-label', '프로필로 이동');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyProfileLabel);
    return;
  }

  applyProfileLabel();
})();
