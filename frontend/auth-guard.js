(() => {
  /**
   * 사용자가 로그인했는지 확인합니다.
   * @returns {boolean} 로그인 상태 (true: 로그인, false: 미로그인)
   */
  function isLoggedIn() {
    const token = localStorage.getItem('yamy_token');
    return !!token;
  }

  /**
   * 현재 로그인한 사용자 정보를 가져옵니다.
   * @returns {object|null} 사용자 정보 또는 null
   */
  function getLoggedInUser() {
    const userStr = localStorage.getItem('yamy_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error('사용자 정보 파싱 오류:', e);
      return null;
    }
  }

  /**
   * 로그인이 필요한 경우 login.html로 리다이렉트합니다.
   * 현재 페이지의 URL을 쿼리 파라미터로 전달하여 로그인 후 복귀 가능하게 합니다.
   */
  function redirectToLoginIfNeeded() {
    if (!isLoggedIn()) {
      const returnUrl = window.location.pathname.split('/').pop() || 'index.html';
      window.location.href = `login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
    }
  }

  /**
   * 로그아웃합니다.
   */
  function logout() {
    localStorage.removeItem('yamy_token');
    localStorage.removeItem('yamy_user');
    window.location.href = 'index.html';
  }

  // 전역에서 접근할 수 있도록 window에 노출
  window.authGuard = {
    isLoggedIn,
    getLoggedInUser,
    redirectToLoginIfNeeded,
    logout,
  };
})();
