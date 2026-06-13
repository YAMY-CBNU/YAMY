(() => {
  // 로그인 확인 / Login Check
  function isLoggedIn() {
    const token = localStorage.getItem('yamy_token');
    return !!token;
  }

  // 로그인 유저 정보 / Logged-in User
  function getLoggedInUser() {
    const userStr = localStorage.getItem('yamy_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error('사용자 정보 파싱 오류:', e);
      return null;
    }
  }

  // 로그인 필요 시 리다이렉트 / Redirect if Unauthenticated
  function redirectToLoginIfNeeded() {
    if (!isLoggedIn()) {
      const returnUrl = window.location.pathname.split('/').pop() || 'index.html';
      window.location.href = `login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
    }
  }

  // 로그아웃 / Logout
  function logout() {
    localStorage.removeItem('yamy_token');
    localStorage.removeItem('yamy_user');
    window.location.href = 'index.html';
  }

  // 전역 노출 / Global Export
  window.authGuard = {
    isLoggedIn,
    getLoggedInUser,
    redirectToLoginIfNeeded,
    logout,
  };
})();
