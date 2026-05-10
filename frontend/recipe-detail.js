(function () {
  const API_BASE = 'http://localhost:3000/api/recipes';
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
    finishedImageContainer: document.getElementById('recipe-finished-image')?.parentElement,
    stepNumber: document.getElementById('step-number'),
    stepTitle: document.getElementById('step-title'),
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
  };

  let steps = [];
  let currentStepIndex = 0;
  let timerInterval = null;
  let totalSeconds = 0;
  let remainingSeconds = 0;
  let timerRunning = false;

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

    const containerHeight = key === 'finishedImage'
      ? 'clamp(16rem, 52vh, 42rem)'
      : 'clamp(12rem, 42vh, 32rem)';
    container.style.cssText += `height:${containerHeight}; display:flex; align-items:center; justify-content:center; background:#fff;`;
    container.innerHTML = `
      <img
        id="${key === 'finishedImage' ? 'recipe-finished-image' : 'step-image'}"
        src="${escapeHtml(src)}"
        alt="${escapeHtml(alt)}"
        class="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
      />
    `;
    elements[key] = container.querySelector('img');
  }

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
        <label class="flex items-center bg-surface-container-lowest border border-outline-variant/20 rounded-xl cursor-pointer hover:bg-surface-container transition-colors group"
               style="gap: clamp(0.9rem,1.3vw,1.2rem); padding: clamp(1rem,1.9vh,1.4rem) clamp(1rem,1.6vw,1.4rem);">
          <input type="checkbox" value="${value}" class="rounded border-outline-variant text-primary focus:ring-primary/30 cursor-pointer flex-shrink-0"
                 style="width: clamp(1.2rem,1.7vw,1.5rem); height: clamp(1.2rem,1.7vw,1.5rem);"/>
          <span class="font-medium text-on-surface group-hover:text-primary transition-colors"
                style="font-size: clamp(1.05rem,1.4vw,1.3rem);">
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
        image: step.imageUrl || recipe.thumbnailUrl || '',
        timerSeconds: Number(step.timerSeconds) || 0,
      }))
      : [{
        number: 1,
        title: '조리 과정',
        description: recipe.description || '등록된 조리 단계가 없습니다.',
        image: recipe.thumbnailUrl || '',
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
    setImageOrPlaceholder('stepImage', step.image, step.title, '\uB2E8\uACC4 \uC774\uBBF8\uC9C0 \uC5C6\uC74C');
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
    setImageOrPlaceholder('finishedImage', recipe.thumbnailUrl, recipe.title || '\uC644\uC131 \uC774\uBBF8\uC9C0', '\uC644\uC131 \uC774\uBBF8\uC9C0 \uC5C6\uC74C');
    if (elements.finishedImage) {
      if (!recipe.thumbnailUrl) {
        setImageOrPlaceholder('finishedImage', '', recipe.title || '\uC644\uC131 \uC774\uBBF8\uC9C0', '\uC644\uC131 \uC774\uBBF8\uC9C0 \uC5C6\uC74C');
      } else {
        elements.finishedImage.src = recipe.thumbnailUrl;
      }
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
