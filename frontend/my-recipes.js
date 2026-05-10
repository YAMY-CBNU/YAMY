(function () {
  const API_BASE = 'http://localhost:3000/api/recipes';

  const elements = {
    publishedGrid: document.getElementById('published-recipes-grid'),
    publishedCount: document.getElementById('published-count'),
    draftGrid: document.getElementById('draft-recipes-grid'),
    draftCount: document.getElementById('draft-count'),
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getRecipeLink(recipe) {
    return `recipe-detail.html?id=${encodeURIComponent(recipe.id)}`;
  }

  function createImageMarkup(recipe, title) {
    if (recipe.thumbnailUrl) {
      return `<img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${escapeHtml(recipe.thumbnailUrl)}" alt="${title}"/>`;
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
    const createdAt = escapeHtml(formatDate(recipe.createdAt));
    const link = escapeHtml(getRecipeLink(recipe));

    return `
      <article class="group">
        <a href="${link}" class="block">
          <div class="relative overflow-hidden rounded-lg aspect-[4/3] mb-2 shadow-sm bg-surface-container-lowest">
            ${createImageMarkup(recipe, title)}
            <div class="absolute top-2 left-2 bg-primary/90 text-on-primary px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">공개</div>
          </div>
          <h3 class="text-sm font-bold tracking-tight mb-1 group-hover:text-primary transition-colors">${title}</h3>
          <div class="flex flex-wrap items-center gap-3 text-on-surface-variant text-[11px] font-medium">
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">schedule</span>${cookTime}</span>
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">signal_cellular_alt</span>${difficulty}</span>
            ${createdAt ? `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">calendar_today</span>${createdAt}</span>` : ''}
          </div>
        </a>
      </article>
    `;
  }

  function createDraftCard(recipe) {
    const title = escapeHtml(recipe.title || '제목 없는 레시피');
    const updatedAt = escapeHtml(formatDate(recipe.updatedAt || recipe.createdAt));
    const link = escapeHtml(`recipe-editor.html?id=${encodeURIComponent(recipe.id)}`);

    return `
      <article class="group relative">
        <a href="${link}" class="block">
          <div class="relative overflow-hidden rounded-lg aspect-[4/3] mb-2 shadow-sm bg-surface-container-lowest">
            ${createImageMarkup(recipe, title)}
            <div class="absolute top-2 left-2 bg-secondary/90 text-on-secondary px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">임시저장</div>
          </div>
          <h3 class="text-sm font-bold tracking-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">${title}</h3>
          <div class="flex flex-wrap items-center gap-3 text-on-surface-variant text-[11px] font-medium">
            ${updatedAt ? `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">calendar_today</span>${updatedAt}</span>` : ''}
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">edit</span>수정 중</span>
          </div>
        </a>
        <button class="delete-draft-button absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-surface-container-lowest/95 px-3 py-1.5 text-[11px] font-bold text-error shadow-sm border border-error/20 hover:bg-error hover:text-on-error transition-colors" type="button" data-recipe-id="${recipe.id}">
          <span class="material-symbols-outlined text-sm">delete</span>
          삭제
        </button>
      </article>
    `;
  }

  function createAddCard() {
    return `
      <a href="recipe-editor.html" class="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/50 rounded-lg aspect-[4/3] p-4 text-center bg-surface-container/30 hover:bg-surface-container/60 hover:border-primary/40 transition-all cursor-pointer group">
        <span class="material-symbols-outlined text-primary/40 group-hover:text-primary/70 text-3xl mb-2 transition-colors" style="font-variation-settings:'FILL' 1;">add_circle</span>
        <p class="text-on-surface-variant font-bold text-xs mb-1">새 레시피 작성하기</p>
        <span class="text-primary font-extrabold text-xs group-hover:underline decoration-2 underline-offset-4">시작하기</span>
      </a>
    `;
  }

  function renderPublished(recipes) {
    if (elements.publishedCount) {
      elements.publishedCount.textContent = String(recipes.length);
    }

    if (!elements.publishedGrid) return;

    if (recipes.length === 0) {
      elements.publishedGrid.innerHTML = `
        <div class="col-span-full rounded-lg bg-surface-container/40 border border-outline-variant/40 p-8 text-center">
          <p class="text-on-surface font-bold text-sm mb-2">아직 공개한 레시피가 없습니다.</p>
          <p class="text-on-surface-variant text-xs mb-5">레시피 작성 화면에서 공개하면 여기에 바로 표시됩니다.</p>
          <a href="recipe-editor.html" class="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-full">레시피 작성하기</a>
        </div>
      `;
      return;
    }

    elements.publishedGrid.innerHTML = recipes.map(createRecipeCard).join('') + createAddCard();
  }

  function renderDrafts(recipes) {
    if (elements.draftCount) {
      elements.draftCount.textContent = String(recipes.length);
    }

    if (!elements.draftGrid) return;

    if (recipes.length === 0) {
      elements.draftGrid.innerHTML = `
        <div class="col-span-full rounded-lg bg-surface-container/40 border border-outline-variant/40 p-8 text-center">
          <p class="text-on-surface font-bold text-sm mb-2">임시저장된 레시피가 없습니다.</p>
          <p class="text-on-surface-variant text-xs mb-5">레시피 작성 중 임시저장 버튼을 누르면 여기에 표시됩니다.</p>
          <a href="recipe-editor.html" class="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-full">새 레시피 작성하기</a>
        </div>
      `;
      return;
    }

    elements.draftGrid.innerHTML = recipes.map(createDraftCard).join('');
  }

  async function deleteDraftRecipe(recipeId) {
    const token = localStorage.getItem('yamy_token');
    if (!token) {
      throw new Error('로그인 후 삭제할 수 있습니다.');
    }

    const response = await fetch(`${API_BASE}/drafts/${encodeURIComponent(recipeId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || '임시저장 레시피 삭제에 실패했습니다.');
    }
  }

  async function loadMyRecipes() {
    const token = localStorage.getItem('yamy_token');
    if (!token) return;

    if (elements.publishedGrid) {
      elements.publishedGrid.innerHTML = `
        <div class="col-span-full rounded-lg bg-surface-container/40 border border-outline-variant/40 p-8 text-center text-on-surface-variant text-sm font-semibold">
          내 레시피를 불러오는 중입니다.
        </div>
      `;
    }

    try {
      const response = await fetch(`${API_BASE}/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '내 레시피를 불러오지 못했습니다.');
      }

      const publishedRecipes = Array.isArray(data.recipes?.published) ? data.recipes.published : Array.isArray(data.recipes) ? data.recipes : [];
      const draftRecipes = Array.isArray(data.recipes?.drafts) ? data.recipes.drafts : [];

      renderPublished(publishedRecipes);
      renderDrafts(draftRecipes);
    } catch (error) {
      if (elements.publishedGrid) {
        elements.publishedGrid.innerHTML = `
          <div class="col-span-full rounded-lg bg-red-50 border border-red-200 p-8 text-center">
            <p class="text-red-800 font-bold text-sm mb-2">내 레시피를 불러오지 못했습니다.</p>
            <p class="text-red-700 text-xs">${escapeHtml(error.message)}</p>
          </div>
        `;
      }
    }
  }

  elements.draftGrid?.addEventListener('click', async (event) => {
    const button = event.target.closest('.delete-draft-button');
    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const recipeId = button.dataset.recipeId;
    if (!recipeId) {
      return;
    }

    const confirmed = window.confirm('임시저장된 레시피를 삭제할까요?');
    if (!confirmed) {
      return;
    }

    button.disabled = true;

    try {
      await deleteDraftRecipe(recipeId);
      await loadMyRecipes();
    } catch (error) {
      window.alert(error.message || '임시저장 레시피 삭제 중 오류가 발생했습니다.');
    } finally {
      button.disabled = false;
    }
  });

  document.addEventListener('DOMContentLoaded', loadMyRecipes);
})();
