(function () {
  const API_BASE = 'http://localhost:3000/api/recipes';
  const elements = {
    grid: document.getElementById('saved-recipes-grid'),
    search: document.getElementById('saved-recipe-search'),
  };

  let savedRecipes = [];

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
      return `<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(recipe.thumbnailUrl)}" alt="${title}"/>`;
    }

    return `
      <div class="w-full h-full flex flex-col items-center justify-center bg-surface-container text-on-surface-variant">
        <span class="material-symbols-outlined text-4xl mb-2 text-primary/40">restaurant_menu</span>
        <span class="text-[11px] font-bold">이미지 없음</span>
      </div>
    `;
  }

  function createRecipeCard(recipe) {
    const title = escapeHtml(recipe.title || '제목 없는 레시피');
    const cookTime = escapeHtml(recipe.cookTime || '시간 미정');
    const difficulty = escapeHtml(recipe.difficulty || '난이도 미정');
    const recipeId = escapeHtml(recipe.id);
    const link = `recipe-detail.html?id=${encodeURIComponent(recipe.id)}`;

    return `
      <article class="group" data-saved-recipe-id="${recipeId}">
        <div class="relative h-[200px] rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all bg-surface-container">
          <a href="${link}" class="absolute inset-0 block">
            ${createImageMarkup(recipe, title)}
          </a>
          <button
            type="button"
            data-remove-saved="${recipeId}"
            class="absolute top-3 right-3 bg-white/90 backdrop-blur p-2 rounded-full text-primary shadow-sm hover:bg-primary hover:text-white transition-colors"
            aria-label="${title} 저장 해제"
            title="저장 해제"
          >
            <span class="material-symbols-outlined text-[20px]" style="font-variation-settings:'FILL' 1">bookmark</span>
          </button>
        </div>
        <a href="${link}" class="block space-y-1">
          <h3 class="text-lg font-bold group-hover:text-primary transition-colors">${title}</h3>
          <p class="text-sm text-on-surface-variant flex flex-wrap items-center gap-3">
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-base">schedule</span>${cookTime}</span>
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-base">bar_chart</span>${difficulty}</span>
          </p>
        </a>
      </article>
    `;
  }

  function renderRecipes() {
    if (!elements.grid) return;

    const keyword = elements.search?.value.trim().toLocaleLowerCase('ko-KR') || '';
    const filteredRecipes = savedRecipes.filter((recipe) => {
      if (!keyword) return true;
      const searchable = [
        recipe.title,
        recipe.description,
        recipe.categories?.method,
        recipe.categories?.situation,
        recipe.categories?.mainIngredient,
        recipe.categories?.type,
      ].filter(Boolean).join(' ').toLocaleLowerCase('ko-KR');
      return searchable.includes(keyword);
    });

    if (filteredRecipes.length === 0) {
      const hasSearch = Boolean(keyword);
      elements.grid.innerHTML = `
        <div class="col-span-full rounded-2xl bg-surface-container/40 border border-outline-variant/40 p-10 text-center">
          <span class="material-symbols-outlined text-4xl text-primary/40 mb-3">bookmark</span>
          <p class="text-on-surface font-bold mb-2">${hasSearch ? '검색 결과가 없습니다.' : '저장된 레시피가 없습니다.'}</p>
          <p class="text-on-surface-variant text-sm mb-5">${hasSearch ? '다른 검색어를 입력해보세요.' : '레시피 상세 화면에서 저장 버튼을 눌러 추가할 수 있습니다.'}</p>
          ${hasSearch ? '' : '<a href="index.html" class="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary">레시피 탐색하기</a>'}
        </div>
      `;
      return;
    }

    elements.grid.innerHTML = filteredRecipes.map(createRecipeCard).join('');
  }

  async function loadSavedRecipes() {
    const token = localStorage.getItem('yamy_token');
    if (!token || !elements.grid) return;

    elements.grid.innerHTML = `
      <div class="col-span-full p-10 text-center text-on-surface-variant font-semibold">
        저장된 레시피를 불러오는 중입니다.
      </div>
    `;

    try {
      const response = await fetch(`${API_BASE}/saved`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem('yamy_token');
        localStorage.removeItem('yamy_user');
        const returnUrl = window.location.pathname.split('/').pop() || 'my-picks.html';
        window.location.href = `login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || '저장된 레시피를 불러오지 못했습니다.');
      }

      savedRecipes = Array.isArray(data.recipes) ? data.recipes : [];
      renderRecipes();
    } catch (error) {
      elements.grid.innerHTML = `
        <div class="col-span-full rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
          <p class="font-bold text-red-800 mb-2">저장된 레시피를 불러오지 못했습니다.</p>
          <p class="text-sm text-red-700">${escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  async function removeSavedRecipe(recipeId, button) {
    const token = localStorage.getItem('yamy_token');
    if (!token) {
      window.authGuard?.redirectToLoginIfNeeded();
      return;
    }

    button.disabled = true;
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(recipeId)}/saved`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '저장 해제에 실패했습니다.');
      }

      savedRecipes = savedRecipes.filter((recipe) => Number(recipe.id) !== Number(recipeId));
      renderRecipes();
    } catch (error) {
      window.alert(error.message || '저장 해제 중 오류가 발생했습니다.');
      button.disabled = false;
    }
  }

  elements.search?.addEventListener('input', renderRecipes);

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-remove-saved]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    removeSavedRecipe(button.dataset.removeSaved, button);
  });

  document.addEventListener('DOMContentLoaded', loadSavedRecipes);
})();
