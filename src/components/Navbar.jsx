import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'

function Navbar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  function handleSearch(e) {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl flex justify-between items-center px-4 md:px-12 h-16 md:h-24 max-w-full mx-auto border-b border-outline-variant/30">
      <div className="flex items-center gap-4 md:gap-12 min-w-0">
        <Link to="/" className="text-3xl font-extrabold text-primary font-headline tracking-tighter">YAMY</Link>
        <div className="hidden md:flex items-center gap-8 font-headline tracking-tight">
          <Link to="/search" className="text-primary border-b-2 border-primary pb-1 font-bold">검색하기</Link>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">내 레시피</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">저장됨</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">레시피 작성</a>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-6 flex-shrink-0">
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            className="bg-surface-container border border-outline-variant/50 rounded-full pl-11 pr-6 py-2.5 text-sm focus:ring-2 focus:ring-primary w-72 transition-all outline-none"
            placeholder="요리 영감 검색..."
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </form>
        <a href="#" className="hidden px-4 py-2.5 rounded-full bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all text-sm font-semibold whitespace-nowrap">
          프로필
        </a>
        <a href="#" className="bg-primary text-on-primary px-4 md:px-8 py-2 md:py-2.5 rounded-full font-headline font-bold text-xs md:text-sm hover:opacity-90 transition-all duration-150 shadow-sm whitespace-nowrap">
          로그인
        </a>
      </div>
    </nav>
  )
}

export default Navbar
