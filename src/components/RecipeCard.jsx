import { useState } from 'react'

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'

const DIFFICULTY_COLOR = {
  '아무나': 'text-green-600',
  '초급':   'text-blue-500',
  '중급':   'text-amber-500',
  '고급':   'text-red-500',
}

export default function RecipeCard({ recipe }) {
  const [saved, setSaved] = useState(false)
  const [imgSrc, setImgSrc] = useState(recipe.thumbnail_url || FALLBACK_IMG)

  const diffColor = DIFFICULTY_COLOR[recipe.difficulty] || 'text-on-surface-variant'

  return (
    <div className="group relative bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
      {/* 이미지 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-container">
        <img
          src={imgSrc}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImgSrc(FALLBACK_IMG)}
        />
        {/* 북마크 버튼 */}
        <button
          onClick={e => { e.preventDefault(); setSaved(s => !s) }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-surface/80 backdrop-blur-sm flex items-center justify-center hover:bg-surface transition-colors shadow"
          aria-label="저장"
        >
          <span
            className="material-symbols-outlined text-lg text-amber-400"
            style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </span>
        </button>
      </div>

      {/* 정보 */}
      <div className="p-3">
        <h3 className="font-bold text-on-surface text-sm leading-snug line-clamp-2 mb-2">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
          {recipe.cook_time && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">timer</span>
              {recipe.cook_time}
            </span>
          )}
          {recipe.difficulty && (
            <span className={`flex items-center gap-1 font-semibold ${diffColor}`}>
              <span className="material-symbols-outlined text-sm">bar_chart</span>
              {recipe.difficulty}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
