(function () {
  const API_BASE = 'http://localhost:3000/api/recipes';
  const fallbackImage = 'https://cdnweb01.wikitree.co.kr/webdata/editor/202504/16/img_20250416102835_b3807a44.webp';

  const elements = {
    title: document.getElementById('recipe-title-main'),
    description: document.getElementById('recipe-description-main'),
    tags: document.getElementById('recipe-tags'),
    cookTimeChip: document.getElementById('recipe-cook-time-chip'),
    difficultyChip: document.getElementById('recipe-difficulty-chip'),
    servingChip: document.getElementById('recipe-serving-chip'),
    ingredientForm: document.getElementById('ingredient-form'),
    missingIngredients: document.getElementById('missing-ingredients'),
    finishedImage: document.getElementById('recipe-finished-image'),
    stepNumber: document.getElementById('step-number'),
    stepTitle: document.getElementById('step-title'),
    stepDescription: document.getElementById('step-description'),
    stepImage: document.getElementById('step-image'),
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
  };

  let steps = [];
  let currentStepIndex = 0;
  let timerInterval = null;
  let totalSeconds = 0;
  let remainingSeconds = 0;
  let timerRunning = false;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderChip(element, icon, text) {
    if (!element) return;
    element.innerHTML = `<span class="material-symbols-outlined text-base text-primary">${icon}</span>${escapeHtml(text || '-')}`;
  }

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

  function updateMissingIngredients() {
    if (!elements.missingIngredients || !elements.ingredientForm) return;

    const missing = Array.from(elements.ingredientForm.querySelectorAll('input[type="checkbox"]'))
      .filter((checkbox) => !checkbox.checked)
      .map((checkbox) => checkbox.value);

    elements.missingIngredients.textContent = missing.length > 0 ? missing.join(', ') : '없음';
  }

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

  function buildSteps(recipe) {
    const recipeSteps = Array.isArray(recipe.steps) ? recipe.steps : [];

    steps = recipeSteps.length > 0
      ? recipeSteps.map((step, index) => ({
        number: index + 1,
        title: `${index + 1}단계`,
        description: step.description || '',
        image: step.imageUrl || recipe.thumbnailUrl || fallbackImage,
        timerSeconds: Number(step.timerSeconds) || 0,
      }))
      : [{
        number: 1,
        title: '조리 과정',
        description: recipe.description || '등록된 조리 단계가 없습니다.',
        image: recipe.thumbnailUrl || fallbackImage,
        timerSeconds: 0,
      }];
  }

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

  function formatTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  function stopTimer() {
    timerRunning = false;
    window.clearInterval(timerInterval);
    if (elements.startTimerButton) elements.startTimerButton.style.display = 'inline-flex';
    if (elements.pauseTimerButton) elements.pauseTimerButton.style.display = 'none';
  }

  function renderTimer(step) {
    stopTimer();
    totalSeconds = step.timerSeconds;
    remainingSeconds = step.timerSeconds;

    if (!elements.timerContainer) return;

    if (!step.timerSeconds) {
      elements.timerContainer.style.display = 'none';
      return;
    }

    elements.timerContainer.style.display = 'block';
    elements.timerContainer.classList.remove('timer-finished');
    if (elements.timerDisplay) elements.timerDisplay.textContent = formatTimer(remainingSeconds);
    if (elements.timerProgressBar) elements.timerProgressBar.style.width = '0%';
  }

  function renderStep() {
    const step = steps[currentStepIndex];
    if (!step) return;

    if (elements.stepNumber) elements.stepNumber.textContent = String(step.number);
    if (elements.stepTitle) elements.stepTitle.textContent = step.title;
    if (elements.stepDescription) elements.stepDescription.textContent = step.description;
    if (elements.stepImage) {
      elements.stepImage.src = step.image;
      elements.stepImage.alt = step.title;
    }
    if (elements.stepCounter) elements.stepCounter.textContent = `${step.number} / ${steps.length}`;
    if (elements.prevButton) elements.prevButton.disabled = currentStepIndex === 0;
    if (elements.nextButton) elements.nextButton.disabled = currentStepIndex === steps.length - 1;

    document.querySelectorAll('.indicator-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === currentStepIndex);
    });

    renderTimer(step);
  }

  function renderRecipe(recipe) {
    if (recipe.title) document.title = `${recipe.title} - YAMY`;
    if (elements.title) elements.title.textContent = recipe.title || '레시피';
    if (elements.description) elements.description.textContent = recipe.description || '';
    if (elements.finishedImage) {
      elements.finishedImage.src = recipe.thumbnailUrl || fallbackImage;
      elements.finishedImage.alt = recipe.title || '완성 이미지';
    }

    renderTags(recipe);
    renderChip(elements.cookTimeChip, 'schedule', `소요 시간: ${recipe.cookTime || '-'}`);
    renderChip(elements.difficultyChip, 'signal_cellular_alt', `난이도: ${recipe.difficulty || '-'}`);
    renderChip(elements.servingChip, 'group', recipe.servingSize || '-');
    renderIngredients(recipe);

    currentStepIndex = 0;
    buildSteps(recipe);
    renderIndicators();
    renderStep();
  }

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
    } catch (error) {
      if (elements.description) {
        elements.description.textContent = error.message;
      }
    }
  }

  function tickTimer() {
    if (remainingSeconds <= 0) {
      stopTimer();
      elements.timerContainer?.classList.add('timer-finished');
      elements.notification?.classList.add('show');
      window.setTimeout(() => elements.notification?.classList.remove('show'), 3000);
      return;
    }

    remainingSeconds -= 1;
    if (elements.timerDisplay) elements.timerDisplay.textContent = formatTimer(remainingSeconds);
    if (elements.timerProgressBar && totalSeconds > 0) {
      elements.timerProgressBar.style.width = `${((totalSeconds - remainingSeconds) / totalSeconds) * 100}%`;
    }
  }

  elements.startTimerButton?.addEventListener('click', () => {
    if (timerRunning || remainingSeconds <= 0) return;

    timerRunning = true;
    elements.startTimerButton.style.display = 'none';
    if (elements.pauseTimerButton) elements.pauseTimerButton.style.display = 'inline-flex';
    timerInterval = window.setInterval(tickTimer, 1000);
  });

  elements.pauseTimerButton?.addEventListener('click', stopTimer);

  elements.resetTimerButton?.addEventListener('click', () => {
    const step = steps[currentStepIndex];
    if (step) renderTimer(step);
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

  document.addEventListener('DOMContentLoaded', loadRecipe);
})();
