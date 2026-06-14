(function () {
  const API_BASE = 'http://localhost:3000/api/recipes';
  const PAGE_SIZE = 20;
  const elements = {
    form: document.getElementById('search-results-form'),
    input: document.getElementById('search-results-input'),
    title: document.getElementById('search-results-title'),
    count: document.getElementById('search-results-count'),
    grid: document.getElementById('search-results-grid'),
    loadMore: document.getElementById('search-load-more'),
    authAction: document.getElementById('auth-action'),
  };

  let query = '';
  let recipes = [];
  let nextOffset = 0;
  let hasMore = false;
  let savedRecipeIds = new Set();
  let loading = false;

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
      <article class="group min-w-0">
        <div class="relative h-[210px] rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all bg-surface-container">
          <a href="${href}" class="absolute inset-0 block">
            ${createImageMarkup(recipe, title)}
          </a>
          ${createSaveButton(recipe, title)}
        </div>
        <a href="${href}" class="block space-y-2">
          <h3 class="text-lg font-bold group-hover:text-primary transition-colors line-clamp-2">${title}</h3>
          <p class="text-sm text-on-surface-variant flex flex-wrap items-center gap-3">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-base">schedule</span>${cookTime}
            </span>
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-base">bar_chart</span>${difficulty}
            </span>
            <span class="flex items-center gap-1">
              <span
                class="material-symbols-outlined text-base text-amber-500"
                style="font-variation-settings: 'FILL' 1"
              >star</span>
              ${ratingAverage.toFixed(1)} (${ratingCount})
            </span>
          </p>
        </a>
      </article>
    `;
  }

  function renderRecipes() {
    if (!elements.grid) return;

    if (recipes.length === 0) {
      elements.grid.innerHTML = `
        <div class="col-span-full rounded-2xl bg-surface-container/50 border border-outline-variant/40 px-6 py-14 text-center">
          <span class="material-symbols-outlined text-5xl text-primary/40 mb-3">search_off</span>
          <p class="font-bold text-lg mb-2">검색 결과가 없습니다.</p>
          <p class="text-sm text-on-surface-variant">다른 제목이나 재료명으로 검색해 보세요.</p>
        </div>
      `;
    } else {
      elements.grid.innerHTML = recipes.map(createRecipeCard).join('');
    }

    elements.loadMore?.classList.toggle('hidden', !hasMore);
  }

  function renderLoading(append) {
    if (!elements.grid || append) return;
    elements.grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-on-surface-variant font-semibold">
        레시피를 검색하는 중입니다.
      </div>
    `;
  }

  function renderSearchPrompt() {
    if (!elements.grid) return;
    elements.grid.innerHTML = `
      <div class="col-span-full rounded-2xl border border-dashed border-outline-variant bg-white px-6 py-14 text-center">
        <span class="material-symbols-outlined mb-3 text-5xl text-primary/50">search</span>
        <p class="mb-2 text-lg font-bold">검색어를 입력해 주세요.</p>
        <p class="text-sm text-on-surface-variant">레시피 제목, 설명, 재료명으로 검색할 수 있습니다.</p>
      </div>
    `;
    elements.loadMore?.classList.add('hidden');
  }

  function renderError(message, append) {
    if (!elements.grid) return;
    if (append) {
      window.alert(message);
      return;
    }
    elements.grid.innerHTML = `
      <div class="col-span-full rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center text-red-800">
        ${escapeHtml(message)}
      </div>
    `;
  }

  async function loadSavedRecipeIds() {
    const token = localStorage.getItem('yamy_token');
    if (!token) return;

    const response = await fetch(`${API_BASE}/saved`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      localStorage.removeItem('yamy_token');
      localStorage.removeItem('yamy_user');
      initializeAuthAction();
      return;
    }

    if (!response.ok) return;

    const data = await response.json();
    savedRecipeIds = new Set(
      (Array.isArray(data.recipes) ? data.recipes : []).map((recipe) => Number(recipe.id))
    );
  }

  async function searchRecipes({ append = false } = {}) {
    if (loading || !query) return;

    loading = true;
    elements.loadMore.disabled = true;
    renderLoading(append);

    try {
      const offset = append ? nextOffset : 0;
      const params = new URLSearchParams({
        q: query,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      const response = await fetch(`${API_BASE}/search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '레시피를 검색하지 못했습니다.');
      }

      const nextRecipes = Array.isArray(data.recipes) ? data.recipes : [];
      recipes = append ? [...recipes, ...nextRecipes] : nextRecipes;
      nextOffset = Number(data.nextOffset) || recipes.length;
      hasMore = Boolean(data.hasMore);
      if (elements.count) {
        elements.count.textContent = `총 ${Number(data.total) || 0}개의 레시피`;
      }
      renderRecipes();
    } catch (error) {
      renderError(error.message, append);
    } finally {
      loading = false;
      elements.loadMore.disabled = false;
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    const value = elements.input.value.trim().slice(0, 100);
    if (!value) {
      elements.input.focus();
      return;
    }

    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ q: value }).toString();
    window.location.href = url.toString();
  }

  async function toggleSavedRecipe(recipeId, button) {
    const token = localStorage.getItem('yamy_token');
    if (!token) {
      const returnUrl = `search-results.html?q=${encodeURIComponent(query)}`;
      window.location.href = `login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
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
      if (!response.ok) {
        throw new Error(data.message || '저장 상태를 변경하지 못했습니다.');
      }

      if (data.saved) savedRecipeIds.add(numericRecipeId);
      else savedRecipeIds.delete(numericRecipeId);
      renderRecipes();
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
    }
  }

  function initializeAuthAction() {
    const token = localStorage.getItem('yamy_token');
    if (!elements.authAction || !token) return;

    elements.authAction.textContent = '로그아웃';
    elements.authAction.href = '#';
    elements.authAction.addEventListener('click', (event) => {
      event.preventDefault();
      localStorage.removeItem('yamy_token');
      localStorage.removeItem('yamy_user');
      window.location.reload();
    });
  }

  elements.form?.addEventListener('submit', submitSearch);
  elements.loadMore?.addEventListener('click', () => searchRecipes({ append: true }));
  elements.grid?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-save-recipe]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    toggleSavedRecipe(button.dataset.saveRecipe, button);
  });

  document.addEventListener('DOMContentLoaded', async () => {
    query = new URLSearchParams(window.location.search).get('q')?.trim().slice(0, 100) || '';
    elements.input.value = query;
    initializeAuthAction();

    if (!query) {
      elements.title.textContent = '검색어를 입력해 주세요';
      elements.count.textContent = '';
      renderSearchPrompt();
      elements.input.focus();
      return;
    }

    document.title = `${query} 검색 - YAMY`;
    elements.title.textContent = `"${query}" 검색 결과`;
    await loadSavedRecipeIds();
    searchRecipes();
  });
})();
