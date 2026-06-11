// Footer Component
(function () {
  const placeholder = document.getElementById('site-footer');
  if (!placeholder) return;

  placeholder.outerHTML = `
    <footer class="bg-surface-container w-full pt-14 md:pt-20 pb-28 md:pb-20 px-6 md:px-8 flex flex-col items-center gap-6 md:gap-8 border-t border-outline-variant/30">
      <span class="text-2xl md:text-3xl font-extrabold text-primary font-headline tracking-tighter">YAMY</span>
      <p class="text-on-surface-variant/60 text-xs text-center">© 2026 YAMY. Your Assistant for Making Yummy.</p>
      <div class="flex flex-wrap justify-center gap-6 text-sm font-semibold">
        <a class="text-on-surface-variant hover:text-primary transition-colors" href="landing.html">회사소개</a>
        <a class="text-on-surface-variant hover:text-primary transition-colors" href="#">이용약관</a>
        <a class="text-on-surface-variant hover:text-primary transition-colors" href="#">개인정보처리방침</a>
        <a class="text-on-surface-variant hover:text-primary transition-colors" href="#">문의하기</a>
      </div>
      <div class="flex gap-6">
        <span class="material-symbols-outlined text-primary cursor-pointer text-2xl hover:scale-110 transition-transform">public</span>
        <span class="material-symbols-outlined text-primary cursor-pointer text-2xl hover:scale-110 transition-transform">share</span>
      </div>
    </footer>
  `;
})();
