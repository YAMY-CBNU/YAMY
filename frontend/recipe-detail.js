(function () {
  const API_BASE = 'http://localhost:3000/api/recipes';

  // DOM 요소 / DOM Elements
  const elements = {
    title: document.getElementById('recipe-title-main'),
    description: document.getElementById('recipe-description-main'),
    tags: document.getElementById('recipe-tags'),
    cookTimeChip: document.getElementById('recipe-cook-time-chip'),
    difficultyChip: document.getElementById('recipe-difficulty-chip'),
    servingChip: document.getElementById('recipe-serving-chip'),
    ownerActions: document.getElementById('recipe-owner-actions'),
    editRecipeButton: document.getElementById('edit-recipe-button'),
    deleteRecipeButton: document.getElementById('delete-recipe-button'),
    saveRecipeButton: document.getElementById('save-recipe-button'),
    saveRecipeIcon: document.getElementById('save-recipe-icon'),
    saveRecipeLabel: document.getElementById('save-recipe-label'),
    ingredientForm: document.getElementById('ingredient-form'),
    missingIngredients: document.getElementById('missing-ingredients'),
    cookingTipsSection: document.getElementById('cooking-tips-section'),
    cookingTipsList: document.getElementById('cooking-tips-list'),
    ratingInput: document.getElementById('rating-input'),
    ratingStatus: document.getElementById('rating-status'),
    ratingSummaryAverage: document.getElementById('rating-summary-average'),
    ratingSummaryCount: document.getElementById('rating-summary-count'),
    commentForm: document.getElementById('comment-form'),
    commentLoginPrompt: document.getElementById('comment-login-prompt'),
    commentLoginLink: document.getElementById('comment-login-link'),
    commentContent: document.getElementById('comment-content'),
    commentFormStatus: document.getElementById('comment-form-status'),
    commentSubmitButton: document.getElementById('comment-submit-button'),
    commentListCount: document.getElementById('comment-list-count'),
    commentsList: document.getElementById('comments-list'),
    commentToggleButton: document.getElementById('comment-toggle-button'),
    commentToggleLabel: document.getElementById('comment-toggle-label'),
    commentToggleIcon: document.getElementById('comment-toggle-icon'),
    finishedImage: document.getElementById('recipe-finished-image'),
    finishedImageContainer: document.getElementById('recipe-finished-image')?.parentElement,
    stepNumber: document.getElementById('step-number'),
    stepDescription: document.getElementById('step-description'),
    stepImage: document.getElementById('step-image'),
    stepImageContainer: document.getElementById('step-image')?.parentElement,
    stepCounter: document.getElementById('step-counter'),
    indicators: document.querySelector('#step-counter')?.nextElementSibling,
    prevButton: document.getElementById('prev-btn'),
    nextButton: document.getElementById('next-btn'),
    timerContainer: document.getElementById('timer-container'),
    timerDisplay: document.getElementById('timer-display'),
    timerProgressBar: document.getElementById('timer-progress-bar'),
    startTimerButton: document.getElementById('start-timer'),
    pauseTimerButton: document.getElementById('pause-timer'),
    resetTimerButton: document.getElementById('reset-timer'),
    notification: document.getElementById('notification'),
    // fullscreen
    viewAllButton: document.getElementById('view-all-btn'),
    fsModal: document.getElementById('step-fullscreen-modal'),
    closeFullscreenButton: document.getElementById('close-fullscreen-btn'),
    fsSlideArea: document.getElementById('fs-slide-area'),
    fsLeftHint: document.getElementById('fs-left-hint'),
    fsRightHint: document.getElementById('fs-right-hint'),
    fsStepNumber: document.getElementById('fs-step-number'),
    fsStepDescription: document.getElementById('fs-step-description'),
    fsStepImage: document.getElementById('fs-step-image'),
    fsStepCounter: document.getElementById('fs-step-counter'),
    fsIndicators: document.getElementById('fs-indicators'),
    fsTimerContainer: document.getElementById('fs-timer-container'),
    fsTimerDisplay: document.getElementById('fs-timer-display'),
    fsTimerProgressBar: document.getElementById('fs-timer-progress-bar'),
    fsStartTimerButton: document.getElementById('fs-start-timer'),
    fsPauseTimerButton: document.getElementById('fs-pause-timer'),
    fsResetTimerButton: document.getElementById('fs-reset-timer'),
    fsPrevButton: null,
    fsNextButton: null,
  };

  // 상태 변수 / State
  let steps = [];
  let currentStepIndex = 0;
  let timerInterval = null;
  let totalSeconds = 0;
  let remainingSeconds = 0;
  let timerRunning = false;
  let currentRecipe = null;
  let isRecipeSaved = false;
  let comments = [];
  let myRating = 0;
  let editingCommentId = null;
  let commentsExpanded = false;

  function getStoredUser() {
    const rawUser = localStorage.getItem('yamy_user');
    if (!rawUser) return null;

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }

  function renderOwnerActions(recipe) {
    if (!elements.ownerActions) return;

    const user = getStoredUser();
    const isAdmin = user?.role === 'admin';
    const isOwner = Boolean(
      localStorage.getItem('yamy_token')
      && user
      && (
        isAdmin
        || (
          Number(user.id) === Number(recipe.authorId)
          && !recipe.isExternal
        )
      )
    );

    elements.ownerActions.classList.toggle('hidden', !isOwner);
    elements.ownerActions.classList.toggle('flex', isOwner);

    if (isOwner && elements.editRecipeButton) {
      elements.editRecipeButton.href = `recipe-editor.html?id=${encodeURIComponent(recipe.id)}`;
    }
  }

  function renderSaveButton(saved) {
    isRecipeSaved = saved;
    if (!elements.saveRecipeButton) return;

    elements.saveRecipeButton.setAttribute('aria-pressed', String(saved));
    elements.saveRecipeButton.title = saved ? '저장된 레시피에서 삭제' : '레시피 저장';
    elements.saveRecipeButton.classList.toggle('bg-primary', saved);
    elements.saveRecipeButton.classList.toggle('text-on-primary', saved);
    elements.saveRecipeButton.classList.toggle('bg-surface-container', !saved);
    elements.saveRecipeButton.classList.toggle('text-primary', !saved);

    if (elements.saveRecipeIcon) {
      elements.saveRecipeIcon.style.fontVariationSettings = saved ? "'FILL' 1" : "'FILL' 0";
    }
    if (elements.saveRecipeLabel) {
      elements.saveRecipeLabel.textContent = saved ? '저장됨' : '레시피 저장';
    }
  }

  async function loadSavedState(recipeId) {
    const token = localStorage.getItem('yamy_token');
    if (!token) {
      renderSaveButton(false);
      return;
    }

    const response = await fetch(`${API_BASE}/${encodeURIComponent(recipeId)}/saved`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem('yamy_token');
      localStorage.removeItem('yamy_user');
      renderSaveButton(false);
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || '저장 상태를 불러오지 못했습니다.');
    }

    renderSaveButton(Boolean(data.saved));
  }

  async function toggleSavedRecipe() {
    if (!currentRecipe || !elements.saveRecipeButton) return;

    const token = localStorage.getItem('yamy_token');
    if (!token) {
      const returnUrl = `${window.location.pathname.split('/').pop() || 'recipe-detail.html'}${window.location.search}`;
      window.location.href = `login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
      return;
    }

    elements.saveRecipeButton.disabled = true;
    try {
      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(currentRecipe.id)}/saved`,
        {
          method: isRecipeSaved ? 'DELETE' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '레시피 저장 상태를 변경하지 못했습니다.');
      }

      renderSaveButton(Boolean(data.saved));
    } catch (error) {
      window.alert(error.message || '레시피 저장 중 오류가 발생했습니다.');
    } finally {
      elements.saveRecipeButton.disabled = false;
    }
  }

  // 이미지 플레이스홀더 / Image Placeholder
  function getImagePlaceholderMarkup(label) {
    return `
      <div class="w-full h-full min-h-52 flex flex-col items-center justify-center bg-surface-container text-on-surface-variant">
      <span class="material-symbols-outlined text-5xl mb-2 text-primary/40">restaurant_menu</span>
      <span class="text-xs font-bold">${label}</span>
      </div>
    `;
  }

  function setImageOrPlaceholder(key, src, alt, label) {
    const image = elements[key];
    const container = elements[`${key}Container`] || image?.parentElement;
    if (!container) return;

    if (!src) {
      container.innerHTML = getImagePlaceholderMarkup(label);
      elements[key] = null;
      return;
    }

    container.innerHTML = `
      <img
        id="${key === 'finishedImage' ? 'recipe-finished-image' : 'step-image'}"
        src="${escapeHtml(src)}"
        alt="${escapeHtml(alt)}"
        class="${key === 'finishedImage' ? 'w-full h-52 object-cover hover:scale-105 transition-transform duration-500' : 'w-full h-52 md:h-[440px] object-cover hover:scale-105 transition-transform duration-500'}"
      />
    `;
    elements[key] = container.querySelector('img');
  }

  // HTML 이스케이프 / Escape HTML
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setRatingButtons(container, rating) {
    container?.querySelectorAll('[data-rating-value]').forEach((button) => {
      const active = Number(button.dataset.ratingValue) <= Number(rating);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function updateFeedbackAuth() {
    const loggedIn = Boolean(localStorage.getItem('yamy_token') && getStoredUser());
    elements.commentForm?.classList.toggle('hidden', !loggedIn);
    elements.commentLoginPrompt?.classList.toggle('hidden', loggedIn);

    if (elements.commentLoginLink) {
      const returnUrl = `${window.location.pathname.split('/').pop() || 'recipe-detail.html'}${window.location.search}`;
      elements.commentLoginLink.href = `login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
    }
  }

  function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('text-red-700', isError);
    element.classList.toggle('text-on-surface-variant', !isError);
  }

  function formatCommentDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  function getAuthorInitial(nickname) {
    return String(nickname || '?').trim().charAt(0).toUpperCase() || '?';
  }

  function createAvatarMarkup(author) {
    const nickname = escapeHtml(author?.nickname || '알 수 없는 사용자');
    const initial = escapeHtml(getAuthorInitial(author?.nickname));
    const imageUrl = author?.profileImageUrl;

    if (!imageUrl) {
      return `
        <div class="w-11 h-11 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-extrabold">
          ${initial}
        </div>
      `;
    }

    return `
      <div class="w-11 h-11 shrink-0 rounded-full overflow-hidden bg-primary-container">
        <img
          data-review-avatar
          class="w-full h-full object-cover"
          src="${escapeHtml(imageUrl)}"
          alt="${nickname} 프로필"
        />
        <span
          data-review-avatar-fallback
          class="hidden w-full h-full items-center justify-center font-extrabold text-on-primary-container"
        >${initial}</span>
      </div>
    `;
  }

  function createCommentEditorMarkup(comment) {
    return `
      <div class="mt-4 rounded-xl bg-surface-container p-4">
        <textarea
          data-comment-edit-content
          maxlength="1000"
          rows="4"
          class="w-full resize-y rounded-xl border-outline-variant/50 bg-surface-container-lowest focus:border-primary focus:ring-primary"
        >${escapeHtml(comment.content)}</textarea>
        <div class="flex justify-end gap-2 mt-3">
          <button
            type="button"
            data-comment-action="cancel"
            class="rounded-full px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-highest"
          >취소</button>
          <button
            type="button"
            data-comment-action="save"
            class="rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:opacity-90"
          >수정 완료</button>
        </div>
      </div>
    `;
  }

  function createCommentMarkup(comment) {
    const storedUser = getStoredUser();
    const isAdmin = storedUser?.role === 'admin';
    const isOwner = Boolean(
      localStorage.getItem('yamy_token')
      && storedUser
      && (
        isAdmin
        || Number(storedUser.id) === Number(comment.author?.id)
      )
    );
    const edited = comment.updatedAt
      && comment.createdAt
      && new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime();

    return `
      <article class="py-6" data-comment-id="${escapeHtml(comment.id)}">
        <div class="flex items-start gap-3">
          ${createAvatarMarkup(comment.author)}
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <strong class="text-sm text-on-surface">${escapeHtml(comment.author?.nickname || '알 수 없는 사용자')}</strong>
                  <span class="text-xs text-on-surface-variant">
                    ${escapeHtml(formatCommentDate(comment.createdAt))}${edited ? ' · 수정됨' : ''}
                  </span>
                </div>
              </div>
              ${isOwner ? `
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    data-comment-action="edit"
                    class="rounded-full px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container hover:text-primary"
                  >수정</button>
                  <button
                    type="button"
                    data-comment-action="delete"
                    class="rounded-full px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                  >삭제</button>
                </div>
              ` : ''}
            </div>
            ${editingCommentId === comment.id
              ? createCommentEditorMarkup(comment)
              : `<p class="mt-3 whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed text-on-surface-variant">${escapeHtml(comment.content)}</p>`}
          </div>
        </div>
      </article>
    `;
  }

  function renderRatingSummary(summary) {
    const count = Number(summary?.count) || 0;
    const averageRating = Number(summary?.averageRating) || 0;
    if (elements.ratingSummaryAverage) elements.ratingSummaryAverage.textContent = averageRating.toFixed(1);
    if (elements.ratingSummaryCount) elements.ratingSummaryCount.textContent = `(${count}명 참여)`;
  }

  function renderComments() {
    if (!elements.commentsList) return;
    if (elements.commentListCount) elements.commentListCount.textContent = String(comments.length);
    const canToggle = comments.length > 3;

    elements.commentToggleButton?.classList.toggle('hidden', !canToggle);
    elements.commentToggleButton?.classList.toggle('inline-flex', canToggle);
    elements.commentToggleButton?.setAttribute('aria-expanded', String(commentsExpanded));
    if (elements.commentToggleLabel) {
      elements.commentToggleLabel.textContent = commentsExpanded
        ? '댓글 접기'
        : `전체 댓글 보기 (${comments.length})`;
    }
    if (elements.commentToggleIcon) {
      elements.commentToggleIcon.textContent = commentsExpanded ? 'expand_less' : 'expand_more';
    }

    if (comments.length === 0) {
      elements.commentsList.innerHTML = `
        <div class="py-12 text-center">
          <span class="material-symbols-outlined text-4xl text-primary/40">rate_review</span>
          <p class="mt-2 text-on-surface-variant">첫 번째 댓글을 남겨 보세요.</p>
        </div>
      `;
      return;
    }

    const visibleComments = commentsExpanded ? comments : comments.slice(0, 3);
    elements.commentsList.innerHTML = visibleComments.map(createCommentMarkup).join('');
    elements.commentsList.querySelectorAll('[data-review-avatar]').forEach((image) => {
      image.addEventListener('error', () => {
        image.classList.add('hidden');
        const fallback = image.nextElementSibling;
        fallback?.classList.remove('hidden');
        fallback?.classList.add('flex');
      }, { once: true });
    });
  }

  async function parseFeedbackResponse(response, fallbackMessage) {
    const data = await response.json();
    if (response.status === 401) {
      localStorage.removeItem('yamy_token');
      localStorage.removeItem('yamy_user');
      updateFeedbackAuth();
    }
    if (!response.ok) {
      throw new Error(data.message || fallbackMessage);
    }
    return data;
  }

  async function loadRating(recipeId) {
    const summaryResponse = await fetch(`${API_BASE}/${encodeURIComponent(recipeId)}/ratings`);
    const summaryData = await parseFeedbackResponse(summaryResponse, '별점을 불러오지 못했습니다.');
    renderRatingSummary(summaryData.summary);

    const token = localStorage.getItem('yamy_token');
    if (!token) {
      myRating = 0;
      setRatingButtons(elements.ratingInput, 0);
      return;
    }

    const myResponse = await fetch(`${API_BASE}/${encodeURIComponent(recipeId)}/ratings/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const myData = await parseFeedbackResponse(myResponse, '내 별점을 불러오지 못했습니다.');
    myRating = Number(myData.rating) || 0;
    setRatingButtons(elements.ratingInput, myRating);
    setStatus(
      elements.ratingStatus,
      myRating ? `내가 남긴 별점: ${myRating}점` : '별을 선택하면 바로 저장됩니다.'
    );
  }

  async function saveRating(rating) {
    if (!currentRecipe) return;
    const token = localStorage.getItem('yamy_token');
    if (!token) {
      const returnUrl = `${window.location.pathname.split('/').pop() || 'recipe-detail.html'}${window.location.search}`;
      window.location.href = `login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
      return;
    }

    setRatingButtons(elements.ratingInput, rating);
    setStatus(elements.ratingStatus, '별점을 저장하는 중입니다.');
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(currentRecipe.id)}/ratings/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating }),
      });
      const data = await parseFeedbackResponse(response, '별점을 저장하지 못했습니다.');
      myRating = data.rating;
      renderRatingSummary(data.summary);
      setStatus(elements.ratingStatus, `${myRating}점이 저장되었습니다.`);
    } catch (error) {
      setRatingButtons(elements.ratingInput, myRating);
      setStatus(elements.ratingStatus, error.message, true);
    }
  }

  async function loadComments(recipeId) {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(recipeId)}/comments`);
    const data = await parseFeedbackResponse(response, '댓글을 불러오지 못했습니다.');
    comments = Array.isArray(data.comments) ? data.comments : [];
    renderComments();
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!currentRecipe || !elements.commentContent || !elements.commentSubmitButton) return;
    const content = elements.commentContent.value.trim();
    if (!content) {
      setStatus(elements.commentFormStatus, '댓글 내용을 입력해 주세요.', true);
      return;
    }

    elements.commentSubmitButton.disabled = true;
    setStatus(elements.commentFormStatus, '댓글을 등록하는 중입니다.');
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(currentRecipe.id)}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('yamy_token') || ''}`,
        },
        body: JSON.stringify({ content }),
      });
      await parseFeedbackResponse(response, '댓글을 등록하지 못했습니다.');
      elements.commentContent.value = '';
      setStatus(elements.commentFormStatus, '댓글이 등록되었습니다.');
      await loadComments(currentRecipe.id);
    } catch (error) {
      setStatus(elements.commentFormStatus, error.message, true);
    } finally {
      elements.commentSubmitButton.disabled = false;
    }
  }

  async function saveEditedComment(commentId, article) {
    const content = article.querySelector('[data-comment-edit-content]')?.value.trim();
    if (!content) {
      window.alert('댓글 내용을 입력해 주세요.');
      return;
    }

    const saveButton = article.querySelector('[data-comment-action="save"]');
    if (saveButton) saveButton.disabled = true;
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(currentRecipe.id)}/comments/${encodeURIComponent(commentId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('yamy_token') || ''}`,
        },
        body: JSON.stringify({ content }),
      });
      await parseFeedbackResponse(response, '댓글을 수정하지 못했습니다.');
      editingCommentId = null;
      await loadComments(currentRecipe.id);
    } catch (error) {
      window.alert(error.message);
      if (saveButton) saveButton.disabled = false;
    }
  }

  async function deleteComment(commentId, button) {
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) return;
    button.disabled = true;
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(currentRecipe.id)}/comments/${encodeURIComponent(commentId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('yamy_token') || ''}` },
      });
      await parseFeedbackResponse(response, '댓글을 삭제하지 못했습니다.');
      if (editingCommentId === commentId) editingCommentId = null;
      await loadComments(currentRecipe.id);
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
    }
  }

  // 정보 칩 / Info Chip
  function renderChip(element, icon, text) {
    if (!element) return;
    element.innerHTML = `<span class="material-symbols-outlined text-base text-primary">${icon}</span>${escapeHtml(text || '-')}`;
  }

  // 카테고리 태그 / Category Tags
  function renderTags(recipe) {
    if (!elements.tags) return;

    const tags = [
      recipe.categories?.method,
      recipe.categories?.situation,
      recipe.categories?.mainIngredient,
      recipe.categories?.type,
    ].filter(Boolean);

    const styles = [
      'bg-primary text-on-primary',
      'bg-secondary-container text-on-secondary-container',
      'bg-tertiary-container text-on-tertiary-container',
      'bg-surface-container-highest text-on-surface',
    ];

    elements.tags.innerHTML = tags.map((tag, index) => (
      `<span class="${styles[index % styles.length]} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${escapeHtml(tag)}</span>`
    )).join('');
  }

  // 미준비 재료 업데이트 / Missing Ingredients
  function updateMissingIngredients() {
    if (!elements.missingIngredients || !elements.ingredientForm) return;

    const missing = Array.from(elements.ingredientForm.querySelectorAll('input[type="checkbox"]'))
      .filter((checkbox) => !checkbox.checked)
      .map((checkbox) => checkbox.value);

    elements.missingIngredients.textContent = missing.length > 0 ? missing.join(', ') : '없음';
  }

  // 재료 목록 / Ingredients
  function renderIngredients(recipe) {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    if (!elements.ingredientForm) return;

    if (ingredients.length === 0) {
      elements.ingredientForm.innerHTML = '<p class="text-sm text-on-surface-variant">등록된 재료가 없습니다.</p>';
      updateMissingIngredients();
      return;
    }

    elements.ingredientForm.innerHTML = ingredients.map((ingredient) => {
      const name = escapeHtml(ingredient.name || '');
      const amount = escapeHtml(ingredient.amount || '');
      const value = amount ? `${name} ${amount}` : name;

      return `
        <label class="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors group">
          <input type="checkbox" value="${value}" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/30 cursor-pointer"/>
          <span class="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">
            ${name}${amount ? ` <span class="text-on-surface-variant font-normal">${amount}</span>` : ''}
          </span>
        </label>
      `;
    }).join('');

    elements.ingredientForm.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', updateMissingIngredients);
    });
    updateMissingIngredients();
  }

  // Cooking Tips
  function renderCookingTips(recipe) {
    if (!elements.cookingTipsSection || !elements.cookingTipsList) return;

    const tips = (Array.isArray(recipe.tips) ? recipe.tips : [])
      .map((tip) => String(tip || '').trim())
      .filter(Boolean);

    elements.cookingTipsSection.classList.toggle('hidden', tips.length === 0);
    elements.cookingTipsList.innerHTML = tips.map((tip) => `
      <li class="flex items-start gap-3 text-base text-on-surface-variant leading-relaxed">
        <span class="material-symbols-outlined text-tertiary mt-0.5 flex-shrink-0">check_circle</span>
        <span>${escapeHtml(tip)}</span>
      </li>
    `).join('');
  }

  // 조리 단계 생성 / Build Steps
  function buildSteps(recipe) {
    const recipeSteps = Array.isArray(recipe.steps) ? recipe.steps : [];

    steps = recipeSteps.length > 0
      ? recipeSteps.map((step, index) => ({
        number: index + 1,
        description: step.description || '',
        image: step.imageUrl || recipe.thumbnailUrl || '',
        timerSeconds: Number(step.timerSeconds) || 0,
      }))
      : [{
        number: 1,
        description: recipe.description || '등록된 조리 단계가 없습니다.',
        image: recipe.thumbnailUrl || '',
        timerSeconds: 0,
      }];
  }

  // 단계 인디케이터 / Step Indicators
  function renderIndicators() {
    if (!elements.indicators) return;

    elements.indicators.innerHTML = steps.map((step, index) => (
      `<div class="indicator-dot${index === currentStepIndex ? ' active' : ''}" data-step="${step.number}"></div>`
    )).join('');

    elements.indicators.querySelectorAll('.indicator-dot').forEach((dot, index) => {
      dot.addEventListener('click', () => {
        currentStepIndex = index;
        renderStep();
      });
    });
  }

  function updateIndicators(container) {
    container?.querySelectorAll('.indicator-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === currentStepIndex);
    });
  }

  // 타이머 포맷 / Timer Format
  function formatTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  // 타이머 정지 / Stop Timer
  function stopTimer() {
    timerRunning = false;
    window.clearInterval(timerInterval);
    if (elements.startTimerButton) elements.startTimerButton.style.display = 'inline-flex';
    if (elements.pauseTimerButton) elements.pauseTimerButton.style.display = 'none';
    if (elements.fsStartTimerButton) elements.fsStartTimerButton.style.display = 'inline-flex';
    if (elements.fsPauseTimerButton) elements.fsPauseTimerButton.style.display = 'none';
  }

  // 타이머 렌더링 / Render Timer
  function renderTimer(step) {
    stopTimer();
    totalSeconds = step.timerSeconds;
    remainingSeconds = step.timerSeconds;

    if (!elements.timerContainer) return;

    if (!step.timerSeconds) {
      elements.timerContainer.style.display = 'none';
      if (elements.fsTimerContainer) elements.fsTimerContainer.style.display = 'none';
      return;
    }

    elements.timerContainer.style.display = 'block';
    elements.timerContainer.classList.remove('timer-finished');
    if (elements.timerDisplay) elements.timerDisplay.textContent = formatTimer(remainingSeconds);
    if (elements.timerProgressBar) elements.timerProgressBar.style.width = '0%';

    if (elements.fsTimerContainer) {
      elements.fsTimerContainer.style.display = 'block';
      elements.fsTimerContainer.classList.remove('timer-finished');
    }
    if (elements.fsTimerDisplay) elements.fsTimerDisplay.textContent = formatTimer(remainingSeconds);
    if (elements.fsTimerProgressBar) elements.fsTimerProgressBar.style.width = '0%';
  }

  // 조리 단계 렌더링 / Render Step
  function renderStep() {
    const step = steps[currentStepIndex];
    if (!step) return;

    if (elements.stepNumber) elements.stepNumber.textContent = String(step.number);
    if (elements.stepDescription) elements.stepDescription.textContent = step.description;
    setImageOrPlaceholder('stepImage', step.image, `${step.number}번째 조리 단계`, '단계 이미지 없음');
    if (elements.stepCounter) elements.stepCounter.textContent = `${step.number} / ${steps.length}`;
    if (elements.prevButton) elements.prevButton.disabled = currentStepIndex === 0;
    if (elements.nextButton) elements.nextButton.disabled = currentStepIndex === steps.length - 1;

    updateIndicators(elements.indicators);

    renderTimer(step);

    if (elements.fsModal && elements.fsModal.style.display === 'flex') {
      renderFullscreenStep();
    }
  }

  // 전체화면 단계 렌더링 / Render Fullscreen Step
  function renderFullscreenStep() {
    const step = steps[currentStepIndex];
    if (!step) return;

    if (elements.fsStepNumber) elements.fsStepNumber.textContent = String(step.number);
    if (elements.fsStepDescription) elements.fsStepDescription.textContent = step.description;

    if (elements.fsStepImage) {
      elements.fsStepImage.src = step.image || '';
      elements.fsStepImage.alt = `${step.number}번째 조리 단계`;
      elements.fsStepImage.style.display = step.image ? 'block' : 'none';
    }

    if (elements.fsStepCounter) elements.fsStepCounter.textContent = `${step.number} / ${steps.length}`;
    updateIndicators(elements.fsIndicators);
  }

  // 전체화면 열기 / Open Fullscreen
  function openFullscreen() {
    if (!elements.fsModal) return;
    elements.fsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    if (elements.fsIndicators && elements.fsIndicators.querySelectorAll('.indicator-dot').length !== steps.length) {
      elements.fsIndicators.innerHTML = steps.map((step, index) => (
        `<div class="indicator-dot${index === currentStepIndex ? ' active' : ''}" data-step="${step.number}"></div>`
      )).join('');
      elements.fsIndicators.querySelectorAll('.indicator-dot').forEach((dot, index) => {
        dot.addEventListener('click', () => {
          currentStepIndex = index;
          renderStep();
        });
      });
    }

    renderFullscreenStep();

    const step = steps[currentStepIndex];
    if (step?.timerSeconds) {
      if (elements.fsTimerContainer) elements.fsTimerContainer.style.display = 'block';
      if (elements.fsTimerDisplay) elements.fsTimerDisplay.textContent = formatTimer(remainingSeconds);
      if (elements.fsTimerProgressBar && totalSeconds > 0) {
        elements.fsTimerProgressBar.style.width = `${((totalSeconds - remainingSeconds) / totalSeconds) * 100}%`;
      }
      if (timerRunning) {
        if (elements.fsStartTimerButton) elements.fsStartTimerButton.style.display = 'none';
        if (elements.fsPauseTimerButton) elements.fsPauseTimerButton.style.display = 'inline-flex';
      }
    }
  }

  // 전체화면 닫기 / Close Fullscreen
  function closeFullscreen() {
    if (!elements.fsModal) return;
    elements.fsModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // 레시피 렌더링 / Render Recipe
  function renderRecipe(recipe) {
    currentRecipe = recipe;
    if (elements.saveRecipeButton) elements.saveRecipeButton.disabled = false;
    if (recipe.title) document.title = `${recipe.title} - YAMY`;
    if (elements.title) elements.title.textContent = recipe.title || '레시피';
    if (elements.description) elements.description.textContent = recipe.description || '';
    setImageOrPlaceholder('finishedImage', recipe.thumbnailUrl, recipe.title || '완성 이미지', '완성 이미지 없음');
    if (elements.finishedImage) {
      if (!recipe.thumbnailUrl) {
        setImageOrPlaceholder('finishedImage', '', recipe.title || '완성 이미지', '완성 이미지 없음');
      } else {
        elements.finishedImage.src = recipe.thumbnailUrl;
      }
      elements.finishedImage.alt = recipe.title || '완성 이미지';
    }

    renderTags(recipe);
    renderOwnerActions(recipe);
    renderChip(elements.cookTimeChip, 'schedule', `소요 시간: ${recipe.cookTime || '-'}`);
    renderChip(elements.difficultyChip, 'signal_cellular_alt', `난이도: ${recipe.difficulty || '-'}`);
    renderChip(elements.servingChip, 'group', recipe.servingSize || '-');
    renderIngredients(recipe);
    renderCookingTips(recipe);

    currentStepIndex = 0;
    buildSteps(recipe);
    renderIndicators();
    renderStep();
  }

  // 레시피 불러오기 / Load Recipe
  async function loadRecipe() {
    const recipeId = new URLSearchParams(window.location.search).get('id');
    if (!recipeId) return;

    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(recipeId)}`);
      const data = await response.json();

      if (!response.ok || !data.recipe) {
        throw new Error(data.message || '레시피를 불러오지 못했습니다.');
      }

      renderRecipe(data.recipe);
      try {
        await loadSavedState(data.recipe.id);
      } catch (savedStateError) {
        console.error('Load saved recipe status error:', savedStateError);
        renderSaveButton(false);
      }
      try {
        await Promise.all([
          loadRating(data.recipe.id),
          loadComments(data.recipe.id),
        ]);
      } catch (feedbackError) {
        console.error('Load recipe feedback error:', feedbackError);
        setStatus(elements.ratingStatus, feedbackError.message, true);
        if (elements.commentsList) {
          elements.commentsList.innerHTML = `
            <p class="py-10 text-center text-red-700">${escapeHtml(feedbackError.message)}</p>
          `;
        }
      }
    } catch (error) {
      if (elements.description) {
        elements.description.textContent = error.message;
      }
    }
  }

  async function deleteCurrentRecipe() {
    if (!currentRecipe) return;
    if (!window.confirm(`"${currentRecipe.title || '이 레시피'}"를 삭제하시겠습니까?\n삭제한 레시피는 복구할 수 없습니다.`)) {
      return;
    }

    const token = localStorage.getItem('yamy_token');
    if (!token) {
      window.authGuard?.redirectToLoginIfNeeded();
      return;
    }

    elements.deleteRecipeButton.disabled = true;

    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(currentRecipe.id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '레시피를 삭제하지 못했습니다.');
      }

      window.location.href = 'my-recipe.html';
    } catch (error) {
      window.alert(error.message || '레시피 삭제 중 오류가 발생했습니다.');
      elements.deleteRecipeButton.disabled = false;
    }
  }

  // 타이머 틱 / Timer Tick
  function tickTimer() {
    if (remainingSeconds <= 0) {
      stopTimer();
      elements.timerContainer?.classList.add('timer-finished');
      elements.fsTimerContainer?.classList.add('timer-finished');
      elements.notification?.classList.add('show');
      window.setTimeout(() => elements.notification?.classList.remove('show'), 3000);
      return;
    }

    remainingSeconds -= 1;
    const formatted = formatTimer(remainingSeconds);
    if (elements.timerDisplay) elements.timerDisplay.textContent = formatted;
    if (elements.fsTimerDisplay) elements.fsTimerDisplay.textContent = formatted;
    if (totalSeconds > 0) {
      const w = `${((totalSeconds - remainingSeconds) / totalSeconds) * 100}%`;
      if (elements.timerProgressBar) elements.timerProgressBar.style.width = w;
      if (elements.fsTimerProgressBar) elements.fsTimerProgressBar.style.width = w;
    }
  }

  // 타이머 시작 / Start Timer
  function startTimer() {
    if (timerRunning || remainingSeconds <= 0) return;
    timerRunning = true;
    if (elements.startTimerButton) elements.startTimerButton.style.display = 'none';
    if (elements.pauseTimerButton) elements.pauseTimerButton.style.display = 'inline-flex';
    if (elements.fsStartTimerButton) elements.fsStartTimerButton.style.display = 'none';
    if (elements.fsPauseTimerButton) elements.fsPauseTimerButton.style.display = 'inline-flex';
    timerInterval = window.setInterval(tickTimer, 1000);
  }

  // 이벤트 리스너 / Event Listeners
  elements.startTimerButton?.addEventListener('click', startTimer);
  elements.pauseTimerButton?.addEventListener('click', stopTimer);
  elements.resetTimerButton?.addEventListener('click', () => {
    const step = steps[currentStepIndex];
    if (step) renderTimer(step);
  });

  elements.fsStartTimerButton?.addEventListener('click', startTimer);
  elements.fsPauseTimerButton?.addEventListener('click', stopTimer);
  elements.fsResetTimerButton?.addEventListener('click', () => {
    const step = steps[currentStepIndex];
    if (step) renderTimer(step);
  });
  elements.deleteRecipeButton?.addEventListener('click', deleteCurrentRecipe);
  elements.saveRecipeButton?.addEventListener('click', toggleSavedRecipe);
  elements.ratingInput?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-rating-value]');
    if (!button) return;
    saveRating(Number(button.dataset.ratingValue));
  });
  elements.commentForm?.addEventListener('submit', submitComment);
  elements.commentToggleButton?.addEventListener('click', () => {
    commentsExpanded = !commentsExpanded;
    editingCommentId = null;
    renderComments();
  });
  elements.commentsList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-comment-action]');
    if (!button || !currentRecipe) return;

    const article = button.closest('[data-comment-id]');
    const commentId = Number(article?.dataset.commentId);
    const comment = comments.find((item) => Number(item.id) === commentId);
    if (!article || !comment) return;

    const action = button.dataset.commentAction;
    if (action === 'edit') {
      editingCommentId = comment.id;
      renderComments();
      return;
    }
    if (action === 'cancel') {
      editingCommentId = null;
      renderComments();
      return;
    }
    if (action === 'save') {
      saveEditedComment(comment.id, article);
      return;
    }
    if (action === 'delete') {
      deleteComment(comment.id, button);
    }
  });

  elements.prevButton?.addEventListener('click', () => {
    if (currentStepIndex > 0) {
      currentStepIndex -= 1;
      renderStep();
    }
  });

  elements.nextButton?.addEventListener('click', () => {
    if (currentStepIndex < steps.length - 1) {
      currentStepIndex += 1;
      renderStep();
    }
  });

  // 전체화면 클릭 이동 / Fullscreen Click Nav
  elements.fsSlideArea?.addEventListener('click', (e) => {
    if (e.target.closest('button, input, select, a, label')) return;
    const rect = elements.fsSlideArea.getBoundingClientRect();
    const isLeft = (e.clientX - rect.left) < rect.width / 2;
    if (isLeft && currentStepIndex > 0) {
      currentStepIndex -= 1;
      renderStep();
    } else if (!isLeft && currentStepIndex < steps.length - 1) {
      currentStepIndex += 1;
      renderStep();
    }
  });

  // 마우스 커서 & 힌트 / Mouse Cursor & Hints
  elements.fsSlideArea?.addEventListener('mousemove', (e) => {
    const onInteractive = !!e.target.closest('button, input, select, a, label');
    if (onInteractive) {
      if (elements.fsLeftHint) elements.fsLeftHint.style.opacity = '0';
      if (elements.fsRightHint) elements.fsRightHint.style.opacity = '0';
      elements.fsSlideArea.style.cursor = '';
      return;
    }
    const rect = elements.fsSlideArea.getBoundingClientRect();
    const isLeft = (e.clientX - rect.left) < rect.width / 2;
    if (isLeft) {
      if (elements.fsLeftHint) elements.fsLeftHint.style.opacity = currentStepIndex > 0 ? '1' : '0';
      if (elements.fsRightHint) elements.fsRightHint.style.opacity = '0';
      elements.fsSlideArea.style.cursor = currentStepIndex > 0 ? 'pointer' : 'default';
    } else {
      if (elements.fsLeftHint) elements.fsLeftHint.style.opacity = '0';
      if (elements.fsRightHint) elements.fsRightHint.style.opacity = currentStepIndex < steps.length - 1 ? '1' : '0';
      elements.fsSlideArea.style.cursor = currentStepIndex < steps.length - 1 ? 'pointer' : 'default';
    }
  });

  elements.fsSlideArea?.addEventListener('mouseleave', () => {
    if (elements.fsLeftHint) elements.fsLeftHint.style.opacity = '0';
    if (elements.fsRightHint) elements.fsRightHint.style.opacity = '0';
    elements.fsSlideArea.style.cursor = '';
  });

  elements.viewAllButton?.addEventListener('click', openFullscreen);
  elements.closeFullscreenButton?.addEventListener('click', closeFullscreen);

  // 키보드 네비게이션 / Keyboard Nav
  document.addEventListener('keydown', (e) => {
    if (elements.fsModal?.style.display !== 'flex') return;
    if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
      currentStepIndex -= 1;
      renderStep();
    } else if (e.key === 'ArrowRight' && currentStepIndex < steps.length - 1) {
      currentStepIndex += 1;
      renderStep();
    } else if (e.key === 'Escape') {
      closeFullscreen();
    }
  });

  // 터치 스와이프 / Touch Swipe
  let fsSwipeStartX = 0;
  elements.fsModal?.addEventListener('touchstart', (e) => {
    fsSwipeStartX = e.touches[0].clientX;
  }, { passive: true });
  elements.fsModal?.addEventListener('touchend', (e) => {
    const diff = fsSwipeStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    if (diff > 0 && currentStepIndex < steps.length - 1) {
      currentStepIndex += 1;
    } else if (diff < 0 && currentStepIndex > 0) {
      currentStepIndex -= 1;
    }
    renderStep();
  }, { passive: true });

  document.addEventListener('DOMContentLoaded', () => {
    updateFeedbackAuth();
    setRatingButtons(elements.ratingInput, 0);
    loadRecipe();
  });
})();
