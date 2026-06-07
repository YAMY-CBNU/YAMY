function Footer() {
  return (
    <footer className="w-full py-10 sm:py-12 px-4 sm:px-6 bg-surface">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 text-center md:text-left">
        <div className="flex flex-col items-center md:items-start gap-3 sm:gap-4">
          <div className="text-lg font-bold text-primary font-headline">YAMY</div>
          <p className="font-body text-xs leading-relaxed text-secondary">
            © 2026 YAMY. Your Assistant for Making Yummy.
          </p>
        </div>
        <div className="flex flex-wrap justify-center md:justify-start gap-4 sm:gap-6">
          <a className="font-body text-xs text-secondary hover:text-primary transition-colors opacity-80 hover:opacity-100" href="#">이용약관</a>
          <a className="font-body text-xs text-primary underline transition-colors opacity-80 hover:opacity-100" href="#">개인정보처리방침</a>
          <a className="font-body text-xs text-secondary hover:text-primary transition-colors opacity-80 hover:opacity-100" href="#">문의하기</a>
        </div>
        <div className="flex gap-4">
          <a className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary/10 transition-colors" href="#">
            <span className="material-symbols-outlined text-sm text-secondary">public</span>
          </a>
          <a className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary/10 transition-colors" href="#">
            <span className="material-symbols-outlined text-sm text-secondary">share</span>
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
