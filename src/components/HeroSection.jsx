function HeroSection() {
  return (
    <section
      className="relative fluid-section fluid-px overflow-hidden"
      style={{ paddingTop: 'clamp(5rem, 10vw, 8rem)' }}
    >
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 fluid-gap items-center">
        {/* 텍스트 */}
        <div className="z-10 text-center lg:text-left">
          <span
            className="inline-block px-4 py-1.5 fluid-mb-sm rounded-full bg-secondary-container text-on-secondary-container font-bold tracking-widest uppercase"
            style={{ fontSize: 'clamp(0.65rem, 1vw, 0.75rem)' }}
          >
            Introducing YAMY
          </span>
          <h1 className="fluid-h1 font-extrabold text-on-surface tracking-tighter fluid-mb">
            실패없는 요리,<br />
            가장 쉬운&nbsp;<span className="inline">레시피</span><br />
            <span className="text-primary italic">YAMY</span>
          </h1>
          <p className="fluid-body text-secondary max-w-lg fluid-mb leading-relaxed mx-auto lg:mx-0">
            내가 사랑하는 레시피만 쏙쏙 골라 담고,<br />
            나만의 비법을 세상과 공유해 보세요.<br />
            요리 초보도 셰프로 만드는 스마트한 주방 어시스턴트가 찾아옵니다.
          </p>
          <div className="flex flex-wrap fluid-gap justify-center lg:justify-start">
            <a href="index.html" className="fluid-btn bg-primary text-on-primary rounded-xl font-bold hover:shadow-xl transition-all">
              시작하기
            </a>
            <a href="recipe-editor.html" className="fluid-btn bg-surface-container text-secondary rounded-xl font-bold hover:bg-surface-container-high transition-all">
              레시피 작성하기
            </a>
          </div>
        </div>

        {/* 이미지 */}
        <div className="relative mt-8 lg:mt-0">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary-fixed opacity-20 rounded-full blur-3xl"></div>
          <div className="rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl lg:rotate-2 transition-transform hover:rotate-0 duration-700">
            <img
              alt="Happy cooking"
              className="fluid-hero-img w-full"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1m40v495qLdbpUBccm7Byk8VOu0BjaWhybz4UJ9y140mqvndro4tP6w-mk2X4QKxeWH_Iplox4E0AZy2nPlJCg3C4mgSf6sblW2t_QRn2kCyDC3kgRiehI0OBZ7Xdh61D3liuVmtX8DV2BjM5MmhBeNBHnkJxZvOP2sl6Dr8EolBYA6uln1913u2K17xDZRcXXqW6Hll89EQfDnAXKmlOEXcNTLzt11s1NzKsKZxVto_N736lOI4G2mGhB-BjOsmFCRppsztjxk4"
            />
          </div>
          {/* 글래스모픽 카드 */}
          <div className="hidden sm:block absolute -bottom-6 -left-6 md:left-[-5%] p-5 bg-surface/60 backdrop-blur-xl rounded-2xl shadow-xl max-w-xs border border-white/20">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <span className="material-symbols-outlined text-primary">timer</span>
              </div>
              <span className="font-bold text-on-surface">실시간 요리 가이드</span>
            </div>
            <p className="text-sm text-secondary leading-snug">"이제 소금을 한 꼬집 넣어주세요. 타이머 3분 시작할게요."</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
