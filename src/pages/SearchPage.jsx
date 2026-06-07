import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'

const API_BASE = 'http://localhost:4000/api'
const PER_PAGE = 20 // 4열 × 5행

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const q    = searchParams.get('q') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))

  const [inputVal, setInputVal]     = useState(q)
  const [recipes, setRecipes]       = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const fetchRecipes = useCallback(async (keyword, pg) => {
    setLoading(true)
    setError('')
    try {
      const endpoint = keyword
        ? `${API_BASE}/recipes/search?q=${encodeURIComponent(keyword)}&page=${pg}&limit=${PER_PAGE}`
        : `${API_BASE}/recipes?page=${pg}&limit=${PER_PAGE}`

      const res = await fetch(endpoint)
      if (!res.ok) throw new Error('서버 응답 오류')
      const data = await res.json()
      setRecipes(data.recipes)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch {
      setError('데이터를 불러오지 못했습니다. 백엔드 서버가 실행 중인지 확인하세요.')
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecipes(q, page)
    setInputVal(q)
  }, [q, page, fetchRecipes])

  function handleSearch(e) {
    e.preventDefault()
    const trimmed = inputVal.trim()
    setSearchParams({ q: trimmed, page: '1' })
  }

  function goPage(pg) {
    setSearchParams({ q, page: String(pg) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 페이지 번호 범위 계산 (최대 5개 버튼)
  function getPageRange() {
    const delta = 2
    const start = Math.max(1, page - delta)
    const end   = Math.min(totalPages, page + delta)
    const range = []
    for (let i = start; i <= end; i++) range.push(i)
    return range
  }

  return (
    <div className="min-h-screen pt-20 md:pt-28 pb-16 fluid-px bg-surface">
      <div className="max-w-7xl mx-auto">

        {/* 검색 헤더 */}
        <div className="mb-8">
          <h1 className="fluid-h2 font-bold text-on-surface mb-4">
            {q ? (
              <><span className="text-primary">"{q}"</span> 검색 결과</>
            ) : (
              '전체 레시피'
            )}
          </h1>

          {/* 검색창 */}
          <form onSubmit={handleSearch} className="flex gap-3 max-w-xl">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="재료나 요리 이름을 검색하세요..."
                className="w-full bg-surface-container border border-outline-variant/50 rounded-full pl-11 pr-6 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all shadow-sm whitespace-nowrap"
            >
              검색
            </button>
          </form>

          {!loading && !error && (
            <p className="mt-3 text-sm text-on-surface-variant">
              총 <span className="font-semibold text-on-surface">{total.toLocaleString()}</span>개의 레시피
            </p>
          )}
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-on-surface-variant text-sm">레시피를 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="material-symbols-outlined text-5xl text-error">wifi_off</span>
            <p className="text-on-surface-variant text-center">{error}</p>
            <button
              onClick={() => fetchRecipes(q, page)}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-full text-sm font-bold hover:opacity-90 transition"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 결과 없음 */}
        {!loading && !error && recipes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant">search_off</span>
            <p className="text-on-surface-variant text-center">
              <span className="font-semibold text-on-surface">"{q}"</span>에 대한 결과가 없어요.<br />
              다른 키워드로 검색해 보세요.
            </p>
            <button
              onClick={() => navigate('/search')}
              className="px-6 py-2.5 bg-surface-container text-on-surface rounded-full text-sm font-bold hover:bg-surface-container-high transition"
            >
              전체 레시피 보기
            </button>
          </div>
        )}

        {/* 4×5 카드 그리드 */}
        {!loading && !error && recipes.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
              {recipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-12">
                {/* 이전 */}
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-full flex items-center justify-center border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>

                {/* 첫 페이지 */}
                {getPageRange()[0] > 1 && (
                  <>
                    <button onClick={() => goPage(1)} className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">1</button>
                    {getPageRange()[0] > 2 && <span className="text-on-surface-variant px-1">…</span>}
                  </>
                )}

                {/* 페이지 번호 */}
                {getPageRange().map(pg => (
                  <button
                    key={pg}
                    onClick={() => goPage(pg)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      pg === page
                        ? 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                {/* 마지막 페이지 */}
                {getPageRange().at(-1) < totalPages && (
                  <>
                    {getPageRange().at(-1) < totalPages - 1 && <span className="text-on-surface-variant px-1">…</span>}
                    <button onClick={() => goPage(totalPages)} className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">{totalPages}</button>
                  </>
                )}

                {/* 다음 */}
                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page === totalPages}
                  className="w-10 h-10 rounded-full flex items-center justify-center border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
