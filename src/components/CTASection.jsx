import { useState } from 'react'

function CTASection() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    window.location.href = `signup.html?email=${encodeURIComponent(email)}`
  }

  return (
    <section className="fluid-section fluid-px">
      <div className="max-w-5xl mx-auto bg-primary rounded-[2rem] sm:rounded-[3rem] fluid-card text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary-container rounded-full blur-3xl" />
        </div>
        <h2 className="fluid-h2 font-bold text-on-primary fluid-mb-sm relative z-10">
          지금 맛있는 여정을 시작해 보세요!
        </h2>
        <p className="fluid-body text-on-primary/80 fluid-mb relative z-10 max-w-2xl mx-auto">
          전 세계 수천 명의 요리사가 당신과 소통하고 싶어 합니다. 지금 바로 함께 하세요.
        </p>
        <form
          className="relative z-10 max-w-md mx-auto flex flex-col sm:flex-row fluid-gap"
          onSubmit={handleSubmit}
        >
          <div className="flex-grow">
            <input
              className="fluid-body w-full px-5 py-3 rounded-xl border-none bg-surface-container-lowest/20 backdrop-blur-md text-on-primary placeholder:text-on-primary/50 focus:ring-2 focus:ring-white transition-all outline-none"
              placeholder="이메일 주소를 입력하세요"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            className="fluid-btn bg-white text-primary rounded-xl font-bold hover:opacity-90 transition-all shadow-lg active:scale-95 whitespace-nowrap"
            type="submit"
          >
            지금 가입하기
          </button>
        </form>
      </div>
    </section>
  )
}

export default CTASection
