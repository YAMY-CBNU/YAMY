(function () {
  const API_BASE = 'http://localhost:3000/api/recipes';
  const RECENT_API_URL = `${API_BASE}?limit=8`;
  const POPULAR_API_URL = `${API_BASE}/popular?limit=8`;
  const RECOMMENDATIONS_API_URL = `${API_BASE}/recommendations?limit=12`;
  const recommendedRecipeLink = document.getElementById('recommended-recipe-link');
  const recommendedRecipeImage = document.getElementById('recommended-recipe-image');
  const recommendedRecipeTitle = document.getElementById('recommended-recipe-title');
  const recommendedRecipeDescription = document.getElementById('recommended-recipe-description');
  const popularRecipesList = document.getElementById('popular-recipes-list');
  const recentRecipesList = document.getElementById('recent-recipes-list');
  let recommendedRecipes = [];
  let recommendedRecipeIndex = 0;
  let recommendationTimer = null;
  let popularRecipes = [];
  let recentRecipes = [];
  let savedRecipeIds = new Set();

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createImageMarkup(recipe, title) {
    if (recipe.thumbnailUrl) {
      return `
        <img
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          src="${escapeHtml(recipe.thumbnailUrl)}"
          alt="${title}"
        />
      `;
    }

    return `
      <div class="w-full h-full flex flex-col items-center justify-center bg-surface-container text-on-surface-variant">
        <span class="material-symbols-outlined text-5xl text-primary/40">restaurant_menu</span>
        <span class="mt-2 text-xs font-bold">이미지 없음</span>
      </div>
    `;
  }

  function createCategoryMarkup(recipe) {
    const categories = [
      recipe.categories?.method,
      recipe.categories?.situation,
      recipe.categories?.mainIngredient,
      recipe.categories?.type,
    ]
      .map((category) => String(category || '').trim())
      .filter(Boolean);
    const uniqueCategories = [...new Set(categories)];

    if (uniqueCategories.length === 0) return '';

    return `
      <div class="flex flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-primary">
        ${uniqueCategories.map((category) => (
          `<span>#${escapeHtml(category.replace(/^#+/, ''))}</span>`
        )).join('')}
      </div>
    `;
  }

  function createSaveButton(recipe, title) {
    const saved = savedRecipeIds.has(Number(recipe.id));
    return `
      <button
        type="button"
        data-save-recipe="${escapeHtml(recipe.id)}"
        class="absolute top-3 right-3 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur transition-colors ${
          saved
            ? 'bg-primary text-on-primary'
            : 'bg-white/90 text-primary hover:bg-primary hover:text-on-primary'
        }"
        aria-pressed="${saved}"
        aria-label="${title} ${saved ? '저장 해제' : '저장하기'}"
        title="${saved ? '저장 해제' : '저장하기'}"
      >
        <span
          class="material-symbols-outlined text-base"
          style="font-variation-settings: 'FILL' ${saved ? '1' : '0'}"
        >bookmark</span>
        <span>${saved ? '저장됨' : '저장하기'}</span>
      </button>
    `;
  }

  function createRecipeCard(recipe) {
    const title = escapeHtml(recipe.title || '제목 없는 레시피');
    const cookTime = escapeHtml(recipe.cookTime || '시간 미정');
    const difficulty = escapeHtml(recipe.difficulty || '난이도 미정');
    const ratingAverage = Number(recipe.ratingSummary?.averageRating) || 0;
    const ratingCount = Number(recipe.ratingSummary?.count) || 0;
    const href = `recipe-detail.html?id=${encodeURIComponent(recipe.id)}`;

    return `
      <article
        class="recent-recipe-card group cursor-pointer snap-start block"
      >
        <div class="relative h-[200px] rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all">
          <a href="${href}" class="absolute inset-0 block">
            ${createImageMarkup(recipe, title)}
          </a>
          ${createSaveButton(recipe, title)}
        </div>
        <a href="${href}" class="block space-y-2">
          <h3 class="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">${title}</h3>
          ${createCategoryMarkup(recipe)}
          <p class="text-sm text-on-surface-variant flex flex-wrap items-center gap-3">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-base">schedule</span>
              <span>${cookTime}</span>
            </span>
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-base">bar_chart</span>
              <span>${difficulty}</span>
            </span>
            <span class="flex items-center gap-1" aria-label="평균 별점 ${ratingAverage.toFixed(1)}점, ${ratingCount}명 참여">
              <span
                class="material-symbols-outlined text-base text-amber-500"
                style="font-variation-settings: 'FILL' 1"
              >star</span>
              <span>${ratingAverage.toFixed(1)} (${ratingCount})</span>
            </span>
          </p>
        </a>
      </article>
    `;
  }

  function renderRecipeList(container, recipes, emptyMessage) {
    if (!container) return;

    if (recipes.length === 0) {
      container.innerHTML = `
        <div class="min-w-full rounded-2xl bg-surface-container px-6 py-10 text-center text-on-surface-variant">
          ${escapeHtml(emptyMessage)}
        </div>
      `;
      return;
    }

    container.innerHTML = recipes.map(createRecipeCard).join('');
  }

  function truncateRecommendationDescription(value, maxLength = 60) {
    const description = String(value || '').trim();
    if (!description) return '자세한 조리법을 확인해 보세요.';
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength).trimEnd()}... 더보기`;
  }

  function renderRecommendedRecipe(recipe, animate = false) {
    if (
      !recommendedRecipeLink
      || !recommendedRecipeImage
      || !recommendedRecipeTitle
      || !recommendedRecipeDescription
      || !recipe
    ) {
      return;
    }

    const updateContent = () => {
      recommendedRecipeLink.href = `recipe-detail.html?id=${encodeURIComponent(recipe.id)}`;
      recommendedRecipeLink.setAttribute(
        'aria-label',
        `${recipe.title || '추천 레시피'} 상세 보기`
      );
      recommendedRecipeImage.src = recipe.thumbnailUrl;
      recommendedRecipeImage.alt = recipe.title || '오늘의 추천 레시피';
      recommendedRecipeTitle.textContent = recipe.title || '오늘의 추천 레시피';
      recommendedRecipeDescription.textContent = truncateRecommendationDescription(recipe.description);
      recommendedRecipeLink.classList.remove('is-changing');
    };

    if (!animate) {
      updateContent();
      return;
    }

    recommendedRecipeLink.classList.add('is-changing');
    window.setTimeout(updateContent, 300);
  }

  function scheduleNextRecommendation() {
    window.clearTimeout(recommendationTimer);

    if (recommendedRecipes.length < 2 || document.hidden) {
      return;
    }

    recommendationTimer = window.setTimeout(() => {
      recommendedRecipeIndex = (recommendedRecipeIndex + 1) % recommendedRecipes.length;
      const recipe = recommendedRecipes[recommendedRecipeIndex];
      const image = new Image();

      image.onload = () => {
        renderRecommendedRecipe(recipe, true);
        scheduleNextRecommendation();
      };
      image.onerror = () => {
        scheduleNextRecommendation();
      };
      image.src = recipe.thumbnailUrl;
    }, 5000);
  }

  async function loadRecommendedRecipes() {
    if (!recommendedRecipeLink) return;

    try {
      const response = await fetch(RECOMMENDATIONS_API_URL);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '오늘의 추천 레시피를 불러오지 못했습니다.');
      }

      recommendedRecipes = (Array.isArray(data.recipes) ? data.recipes : [])
        .filter((recipe) => recipe?.id && recipe?.thumbnailUrl);

      if (recommendedRecipes.length === 0) {
        throw new Error('표시할 추천 레시피가 없습니다.');
      }

      recommendedRecipeIndex = 0;
      renderRecommendedRecipe(recommendedRecipes[0]);
      scheduleNextRecommendation();
    } catch (error) {
      recommendedRecipeLink.removeAttribute('href');
      recommendedRecipeTitle.textContent = '오늘의 추천 레시피';
      recommendedRecipeDescription.textContent = error.message;
    }
  }

  function renderRecipeSections() {
    renderRecipeList(popularRecipesList, popularRecipes, '표시할 인기 레시피가 없습니다.');
    renderRecipeList(recentRecipesList, recentRecipes, '아직 공개된 레시피가 없습니다.');
  }

  function renderRecentRecipes() {
    renderRecipeList(recentRecipesList, recentRecipes, '아직 공개된 레시피가 없습니다.');
  }

  async function loadSavedRecipeIds() {
    const token = localStorage.getItem('yamy_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem('yamy_token');
        localStorage.removeItem('yamy_user');
        return;
      }
      if (!response.ok) return;

      savedRecipeIds = new Set(
        (Array.isArray(data.recipes) ? data.recipes : []).map((recipe) => Number(recipe.id))
      );
    } catch (error) {
      console.error('Load saved recipes for recent cards error:', error);
    }
  }

  async function loadRecentRecipes() {
    if (!recentRecipesList) return;

    try {
      const response = await fetch(RECENT_API_URL);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '최근 레시피를 불러오지 못했습니다.');
      }

      recentRecipes = Array.isArray(data.recipes) ? data.recipes : [];
      if (recentRecipes.length === 0) {
        recentRecipesList.innerHTML = `
          <div class="min-w-full rounded-2xl bg-surface-container px-6 py-10 text-center text-on-surface-variant">
            아직 공개된 레시피가 없습니다.
          </div>
        `;
        return;
      }

      await loadSavedRecipeIds();
      renderRecentRecipes();
    } catch (error) {
      recentRecipesList.innerHTML = `
        <div class="min-w-full rounded-2xl bg-error-container px-6 py-10 text-center text-on-error-container">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }

  async function loadPopularRecipes() {
    if (!popularRecipesList) return;

    try {
      const response = await fetch(POPULAR_API_URL);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '인기 레시피를 불러오지 못했습니다.');
      }

      popularRecipes = Array.isArray(data.recipes) ? data.recipes : [];
      await loadSavedRecipeIds();
      renderRecipeList(popularRecipesList, popularRecipes, '표시할 인기 레시피가 없습니다.');
    } catch (error) {
      popularRecipesList.innerHTML = `
        <div class="min-w-full rounded-2xl bg-error-container px-6 py-10 text-center text-on-error-container">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }

  async function toggleSavedRecipe(recipeId, button) {
    const token = localStorage.getItem('yamy_token');
    if (!token) {
      window.location.href = `login.html?returnUrl=${encodeURIComponent('index.html')}`;
      return;
    }

    const numericRecipeId = Number(recipeId);
    const saved = savedRecipeIds.has(numericRecipeId);
    button.disabled = true;

    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(recipeId)}/saved`, {
        method: saved ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.status === 401) {
        localStorage.removeItem('yamy_token');
        localStorage.removeItem('yamy_user');
        window.location.href = `login.html?returnUrl=${encodeURIComponent('index.html')}`;
        return;
      }
      if (!response.ok) {
        throw new Error(data.message || '저장 상태를 변경하지 못했습니다.');
      }

      if (data.saved) {
        savedRecipeIds.add(numericRecipeId);
      } else {
        savedRecipeIds.delete(numericRecipeId);
      }
      renderRecipeSections();
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
    }
  }

  function handleRecipeListClick(event) {
    const button = event.target.closest('[data-save-recipe]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    toggleSavedRecipe(button.dataset.saveRecipe, button);
  }

  popularRecipesList?.addEventListener('click', handleRecipeListClick);
  recentRecipesList?.addEventListener('click', handleRecipeListClick);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearTimeout(recommendationTimer);
      return;
    }
    scheduleNextRecommendation();
  });

  document.addEventListener('DOMContentLoaded', () => {
    loadRecommendedRecipes();
    loadPopularRecipes();
    loadRecentRecipes();
  });
})();
