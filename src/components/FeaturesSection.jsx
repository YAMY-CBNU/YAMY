const COOKING_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZpTorghYmjQQQk3Ggu2j3dDVY1EH_0JjlfM5Zx6xmU9dYuUrWZvtQyrrbbQlQCQUrl3dO6DyuNJq2OS-p7R0sF6vgrwADod13l5kjWVOAdY49s6W-QSv0tz52s3MfujTssVA50UkaTRHL0r9ShNJj7ZvD96vAei-eWpGYH5ouB3EqlFpL-EZB2vCUQdrQuTWxfE-cP5kWjt9g3bFfWKf2J1tX_nh_zZdQecGWYCeV5sxuwS-6_RkC0LT7N-e8Tv3YCKzJEAx8nFM'
const SEARCH_IMG  = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBl02ya2I-WeF_ejTgsp_XDMSq2clDkeimnaTlEXrBKCcnXXg53KDWgwatwkHy53Ah37AgSEu7aw5u2zIWCA2KDZTiF3YSLFdXqdLPs3EsWPZS4t-XW1EuDqTiClzgT_m51bbVd-G8bVfIZugoE3wp_2saJyuy-MkgGKudI_Xj4DeCOdZ4WNfS-Z8YVXmGHzHI3umwizoR9GiyitsPv5QMBdPk4vh50QORpPkWvF93RD9UH6uAekSA65HexHHt_kMc6Umg82juLn2o'

function FeaturesSection() {
  return (
    <section className="fluid-section bg-surface-container-low">
      <div className="max-w-7xl mx-auto fluid-px">
        <div className="text-center fluid-mb">
          <h2 className="fluid-h2 font-bold text-on-surface fluid-mb-sm">당신의 한 끼를 바꾸는 기술</h2>
          <p className="fluid-body text-secondary max-w-2xl mx-auto">
            더 이상 요리책 앞에서 당황하지 마세요. YAMY가 제안하는 스마트한 주방 라이프.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 fluid-gap">
          {/* 대형: 실시간 요리 가이드 */}
          <div className="md:col-span-8 bg-surface-container-lowest rounded-[1.5rem] sm:rounded-[2rem] fluid-card relative overflow-hidden group md:min-h-[400px]">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-primary-container/10 flex items-center justify-center rounded-xl fluid-mb-sm">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
              </div>
              <h3 className="fluid-h3 font-bold fluid-mb-sm">실시간 요리 가이드</h3>
              <p className="fluid-body text-secondary max-w-md fluid-mb">
                실시간 조리 단계를 안내해 요리 초보도 쉽게!<br />
                음성 명령으로 손을 대지 않고도 다음 단계로 넘어갈 수 있습니다.
              </p>
              <ul className="space-y-3 fluid-mb">
                <li className="flex items-center gap-2 fluid-sm font-medium text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm">check_circle</span> 맞춤형 타이머 자동 설정
                </li>
                <li className="flex items-center gap-2 fluid-sm font-medium text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm">check_circle</span> 핸즈프리 음성 명령 제어
                </li>
              </ul>
            </div>
            <img
              alt="Tablet cooking"
              className="hidden md:block absolute right-0 bottom-0 w-2/3 h-2/3 object-cover rounded-tl-[3rem] transition-transform duration-500 group-hover:scale-105"
              src={COOKING_IMG}
            />
            <img
              alt="Tablet cooking"
              className="md:hidden w-full h-44 object-cover rounded-xl mt-4"
              src={COOKING_IMG}
            />
          </div>

          {/* 세로형: 맞춤 레시피 검색 */}
          <div className="md:col-span-4 bg-tertiary text-on-tertiary rounded-[1.5rem] sm:rounded-[2rem] fluid-card flex flex-col justify-between group md:min-h-[400px]">
            <div>
              <div className="w-12 h-12 bg-white/10 flex items-center justify-center rounded-xl fluid-mb-sm">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
              </div>
              <h3 className="fluid-h3 font-bold fluid-mb-sm">맞춤 레시피 검색</h3>
              <p className="fluid-sm text-on-tertiary/80">
                내 냉장고 상황과 입맛에 딱 맞는 레시피를 찾아보세요. 남은 식재료만 입력하면 끝!
              </p>
            </div>
            <div className="mt-6 overflow-hidden rounded-xl">
              <img
                alt="Recipe search"
                className="w-full object-cover group-hover:scale-110 transition-transform duration-500"
                style={{ height: 'clamp(8rem, 15vw, 10rem)' }}
                src={SEARCH_IMG}
              />
            </div>
          </div>

          {/* 소형: 레시피 공유 */}
          <div className="md:col-span-4 bg-surface-container-lowest rounded-[1.5rem] sm:rounded-[2rem] fluid-card group">
            <div className="w-12 h-12 bg-secondary-container/20 flex items-center justify-center rounded-xl fluid-mb-sm">
              <span className="material-symbols-outlined text-secondary">share</span>
            </div>
            <h3 className="fluid-h4 font-bold fluid-mb-sm">나만의 레시피 공유</h3>
            <p className="fluid-sm text-secondary">직접 만든 레시피를 등록하고 사람들과 공유하는 즐거움을 느껴보세요.</p>
          </div>

          {/* 소형: 북마크 */}
          <div className="md:col-span-4 bg-secondary text-on-secondary rounded-[1.5rem] sm:rounded-[2rem] fluid-card group">
            <div className="w-12 h-12 bg-white/10 flex items-center justify-center rounded-xl fluid-mb-sm">
              <span className="material-symbols-outlined">bookmark_heart</span>
            </div>
            <h3 className="fluid-h4 font-bold fluid-mb-sm">레시피 북마크</h3>
            <p className="fluid-sm text-on-secondary/80">마음에 드는 레시피만 쏙쏙 골라 나만의 소중한 요리책을 만드세요.</p>
          </div>

          {/* 소형: 식재료 구매 */}
          <div className="md:col-span-4 bg-surface-container-lowest rounded-[1.5rem] sm:rounded-[2rem] fluid-card border border-outline-variant/15 group">
            <div className="w-12 h-12 bg-primary-container/10 flex items-center justify-center rounded-xl fluid-mb-sm">
              <span className="material-symbols-outlined text-primary">shopping_cart</span>
            </div>
            <h3 className="fluid-h4 font-bold fluid-mb-sm">간편 식재료 구매</h3>
            <p className="fluid-sm text-secondary">부족한 재료도 앱 내에서 바로 구매할 수 있도록 최저가를 찾아드립니다.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
