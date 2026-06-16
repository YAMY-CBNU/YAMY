(() => {
  function isLoggedIn() {
    const token = localStorage.getItem('yamy_token');
    return !!token;
  }

  function getLoggedInUser() {
    const userStr = localStorage.getItem('yamy_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error('사용자 정보 파싱 오류:', e);
      return null;
    }
  }

  function redirectToLoginIfNeeded() {
    if (!isLoggedIn()) {
      const returnUrl = window.location.pathname.split('/').pop() || 'index.html';
      window.location.href = `login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
    }
  }

  function logout() {
    localStorage.removeItem('yamy_token');
    localStorage.removeItem('yamy_user');
    window.location.href = 'index.html';
  }

  window.authGuard = {
    isLoggedIn,
    getLoggedInUser,
    redirectToLoginIfNeeded,
    logout,
  };
})();
