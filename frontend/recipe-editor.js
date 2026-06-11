(() => {
  const API_BASE = 'http://localhost:3000/api/recipes';
  const recipeIdParam = new URLSearchParams(window.location.search).get('id');
  let currentRecipeId = /^\d+$/.test(recipeIdParam || '') ? Number(recipeIdParam) : null;
  let isSaving = false;

  // DOM 요소 / DOM Elements
  const elements = {
    status: document.getElementById('editor-status'),
    title: document.getElementById('recipe-title'),
    description: document.getElementById('recipe-description'),
    cookTime: document.getElementById('recipe-cook-time'),
    servingSize: document.getElementById('recipe-serving-size'),
    difficulty: document.getElementById('recipe-difficulty'),
    thumbnailDropzone: document.getElementById('thumbnail-dropzone'),
    thumbnailFile: document.getElementById('recipe-thumbnail-file'),
    thumbnailPreview: document.getElementById('thumbnail-preview'),
    thumbnailPlaceholder: document.getElementById('thumbnail-placeholder'),
    method: document.getElementById('category-method'),
    situation: document.getElementById('category-situation'),
    mainIngredient: document.getElementById('category-main-ingredient'),
    type: document.getElementById('category-type'),
    ingredientsList: document.getElementById('ingredients-list'),
    stepsList: document.getElementById('steps-list'),
    addIngredientButton: document.getElementById('add-ingredient-button'),
    addStepButton: document.getElementById('add-step-button'),
    resetButton: document.getElementById('reset-editor-button'),
    draftButton: document.getElementById('save-draft-button'),
    saveButton: document.getElementById('save-recipe-button'),
    ingredientTemplate: document.getElementById('ingredient-row-template'),
    stepTemplate: document.getElementById('step-card-template'),
  };

  // 상태 메시지 / Draft Status
  function showDraftStatus(updatedAt) {
    const savedAt = new Date(updatedAt);
    const formattedSavedAt = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(savedAt);

    elements.status.className = 'mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800';
    elements.status.textContent = `마지막 임시저장: ${formattedSavedAt}`;
    elements.status.classList.remove('hidden');
  }

  function hideStatus() {
    elements.status.classList.add('hidden');
  }

  function showAlert(message) {
    window.alert(message);
  }

  // 이미지 읽기 / Read Image
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('이미지를 읽는 중 오류가 발생했습니다.'));
      reader.readAsDataURL(file);
    });
  }

  async function setThumbnailImage(file) {
    const dataUrl = await readFileAsDataUrl(file);
    elements.thumbnailDropzone.dataset.imageUrl = dataUrl;
    elements.thumbnailPreview.src = dataUrl;
    elements.thumbnailPreview.classList.remove('hidden');
    elements.thumbnailPlaceholder.classList.add('hidden');
  }

  async function setStepImage(card, file) {
    const dataUrl = await readFileAsDataUrl(file);
    card.dataset.imageUrl = dataUrl;
    const preview = card.querySelector('.step-image-preview');
    const placeholder = card.querySelector('.step-image-placeholder');
    const meta = card.querySelector('.step-image-meta');
    const timerSettings = card.querySelector('.timer-settings');

    preview.src = dataUrl;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    if (timerSettings) {
      timerSettings.classList.remove('hidden');
    }
    if (meta) {
      meta.textContent = file.name || '사진 추가됨';
    }
  }

  // 드롭존 바인딩 / Dropzone Bind
  function bindDropzone(dropzone, onFile) {
    if (!dropzone) {
      return;
    }

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add('drop-active');
      });
    });

    ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove('drop-active');
      });
    });

    dropzone.addEventListener('drop', async (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file || !file.type.startsWith('image/')) {
        return;
      }

      try {
        await onFile(file);
      } catch (error) {
        showAlert(error.message || '이미지 업로드 중 오류가 발생했습니다.');
      }
    });
  }

  // 단계 번호 업데이트 / Update Step Numbers
  function updateStepNumbers() {
    const stepCards = Array.from(elements.stepsList.querySelectorAll('.step-card'));
    stepCards.forEach((card, index) => {
      const number = index + 1;
      const watermark = card.querySelector('.step-watermark');
      const badge = card.querySelector('.step-badge');
      const textarea = card.querySelector('.step-description');
      if (watermark) watermark.textContent = String(number);
      if (badge) badge.textContent = String(number);
      if (textarea && !textarea.value.trim()) {
        textarea.placeholder = `${number}번째 단계를 설명해 주세요.`;
      }
    });
  }

  // 재료 행 바인딩 / Bind Ingredient Row
  function bindIngredientRow(row) {
    row.querySelector('.remove-ingredient')?.addEventListener('click', () => {
      const rows = elements.ingredientsList.querySelectorAll('.ingredient-row');
      if (rows.length <= 1) {
        row.querySelector('.ingredient-name').value = '';
        row.querySelector('.ingredient-amount').value = '';
        return;
      }
      row.remove();
    });
  }

  // 조리 단계 카드 바인딩 / Bind Step Card
  function bindStepCard(card) {
    card.querySelector('.toggle-timer-settings')?.addEventListener('click', () => {
      const timerSettings = card.querySelector('.timer-settings');
      timerSettings?.classList.toggle('hidden');
    });

    card.querySelector('.remove-step')?.addEventListener('click', () => {
      const stepCards = elements.stepsList.querySelectorAll('.step-card');
      if (stepCards.length <= 1) {
        card.querySelector('.step-description').value = '';
        card.querySelector('.step-minutes').value = '';
        card.querySelector('.step-seconds').value = '';
        card.dataset.imageUrl = '';
        const preview = card.querySelector('.step-image-preview');
        const placeholder = card.querySelector('.step-image-placeholder');
        const meta = card.querySelector('.step-image-meta');
        const imageInput = card.querySelector('.step-image-file');
        if (preview) {
          preview.src = '';
          preview.classList.add('hidden');
        }
        placeholder?.classList.remove('hidden');
        if (meta) {
          meta.textContent = '사진 없음';
        }
        if (imageInput) {
          imageInput.value = '';
        }
        card.querySelector('.timer-settings')?.classList.add('hidden');
        return;
      }
      card.remove();
      updateStepNumbers();
    });

    const imageInput = card.querySelector('.step-image-file');
    const imageButton = card.querySelector('.select-step-image');
    const dropzone = card.querySelector('.step-image-dropzone');

    imageButton?.addEventListener('click', () => {
      imageInput?.click();
    });

    dropzone?.addEventListener('click', () => {
      imageInput?.click();
    });

    imageInput?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        await setStepImage(card, file);
      } catch (error) {
        showAlert(error.message || '이미지 업로드 중 오류가 발생했습니다.');
      }
    });

    bindDropzone(dropzone, (file) => setStepImage(card, file));
  }

  // 재료 행 추가 / Add Ingredient
  function addIngredientRow() {
    const fragment = elements.ingredientTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.ingredient-row');
    bindIngredientRow(row);
    elements.ingredientsList.appendChild(fragment);
  }

  // 조리 단계 추가 / Add Step
  function addStepCard() {
    const fragment = elements.stepTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.step-card');
    bindStepCard(card);
    elements.stepsList.appendChild(fragment);
    updateStepNumbers();
  }

  function ensureIngredientRows(count) {
    elements.ingredientsList.innerHTML = '';
    for (let index = 0; index < Math.max(count, 1); index += 1) {
      addIngredientRow();
    }
  }

  function ensureStepCards(count) {
    elements.stepsList.innerHTML = '';
    for (let index = 0; index < Math.max(count, 1); index += 1) {
      addStepCard();
    }
  }

  // 에디터 채우기 / Populate Editor
  function populateEditor(recipe) {
    elements.title.value = recipe.title || '';
    elements.description.value = recipe.description || '';
    elements.cookTime.value = recipe.cookTime || '';
    elements.servingSize.value = recipe.servingSize || '';
    elements.difficulty.value = recipe.difficulty || '';
    elements.method.value = recipe.categories?.method || '';
    elements.situation.value = recipe.categories?.situation || '';
    elements.mainIngredient.value = recipe.categories?.mainIngredient || '';
    elements.type.value = recipe.categories?.type || '';

    const thumbnailUrl = recipe.thumbnailUrl || '';
    elements.thumbnailDropzone.dataset.imageUrl = thumbnailUrl;
    elements.thumbnailPreview.src = thumbnailUrl;
    elements.thumbnailPreview.classList.toggle('hidden', !thumbnailUrl);
    elements.thumbnailPlaceholder.classList.toggle('hidden', Boolean(thumbnailUrl));

    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    ensureIngredientRows(ingredients.length);
    elements.ingredientsList.querySelectorAll('.ingredient-row').forEach((row, index) => {
      row.querySelector('.ingredient-name').value = ingredients[index]?.name || '';
      row.querySelector('.ingredient-amount').value = ingredients[index]?.amount || '';
    });

    const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    ensureStepCards(steps.length);
    elements.stepsList.querySelectorAll('.step-card').forEach((card, index) => {
      const step = steps[index] || {};
      const imageUrl = step.imageUrl || '';
      const timerSeconds = Number(step.timerSeconds) || 0;
      card.querySelector('.step-description').value = step.description || '';
      card.querySelector('.step-minutes').value = timerSeconds ? Math.floor(timerSeconds / 60) : '';
      card.querySelector('.step-seconds').value = timerSeconds ? timerSeconds % 60 : '';
      card.dataset.imageUrl = imageUrl;

      const preview = card.querySelector('.step-image-preview');
      const placeholder = card.querySelector('.step-image-placeholder');
      preview.src = imageUrl;
      preview.classList.toggle('hidden', !imageUrl);
      placeholder.classList.toggle('hidden', Boolean(imageUrl));
      card.querySelector('.timer-settings')?.classList.toggle('hidden', !timerSeconds);
    });
    updateStepNumbers();

    if (recipe.status === 'draft' && recipe.updatedAt) {
      showDraftStatus(recipe.updatedAt);
    }
  }

  // 레시피 불러오기 / Load for Edit
  async function loadRecipeForEdit() {
    if (!currentRecipeId) {
      return;
    }

    const token = localStorage.getItem('yamy_token');
    if (!token) {
      throw new Error('로그인 후 임시저장한 레시피를 불러올 수 있습니다.');
    }
    const response = await fetch(`${API_BASE}/${currentRecipeId}/edit`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || '임시저장한 레시피를 불러오지 못했습니다.');
    }

    populateEditor(data.recipe);
  }

  // 재료 수집 / Gather Ingredients
  function gatherIngredients() {
    return Array.from(elements.ingredientsList.querySelectorAll('.ingredient-row'))
      .map((row) => ({
        name: row.querySelector('.ingredient-name')?.value.trim() || '',
        amount: row.querySelector('.ingredient-amount')?.value.trim() || '',
      }))
      .filter((ingredient) => ingredient.name || ingredient.amount);
  }

  // 조리 단계 수집 / Gather Steps
  function gatherSteps() {
    return Array.from(elements.stepsList.querySelectorAll('.step-card'))
      .map((card) => {
        const minutes = Number(card.querySelector('.step-minutes')?.value || 0);
        const seconds = Number(card.querySelector('.step-seconds')?.value || 0);

        if (seconds > 59) {
          throw new Error('타이머 초는 0부터 59까지만 입력할 수 있습니다.');
        }

        return {
          description: card.querySelector('.step-description')?.value.trim() || '',
          imageUrl: card.dataset.imageUrl || null,
          timerSeconds: minutes || seconds ? (minutes * 60) + seconds : null,
        };
      })
      .filter((step) => (
        step.description || step.imageUrl || step.timerSeconds !== null
      ));
  }

  // 에디터 초기화 / Reset Editor
  function resetEditor() {
    elements.title.value = '';
    elements.description.value = '';
    elements.cookTime.value = '';
    elements.servingSize.value = '';
    elements.difficulty.value = '';
    elements.thumbnailDropzone.dataset.imageUrl = '';
    elements.thumbnailPreview.src = '';
    elements.thumbnailPreview.classList.add('hidden');
    elements.thumbnailPlaceholder.classList.remove('hidden');
    elements.thumbnailFile.value = '';
    elements.method.value = '';
    elements.situation.value = '';
    elements.mainIngredient.value = '';
    elements.type.value = '';
    ensureIngredientRows(1);
    ensureStepCards(1);
    hideStatus();
  }

  // 저장 페이로드 / Build Payload
  function buildPayload(status) {
    return {
      status,
      title: elements.title.value.trim(),
      description: elements.description.value.trim(),
      cookTime: elements.cookTime.value.trim(),
      servingSize: elements.servingSize.value.trim(),
      difficulty: elements.difficulty.value.trim(),
      thumbnailUrl: elements.thumbnailDropzone.dataset.imageUrl || null,
      categories: {
        method: elements.method.value.trim(),
        situation: elements.situation.value.trim(),
        mainIngredient: elements.mainIngredient.value.trim(),
        type: elements.type.value.trim(),
      },
      ingredients: gatherIngredients(),
      steps: gatherSteps(),
    };
  }

  // 레시피 저장 / Save Recipe
  async function saveRecipe(status) {
    if (isSaving) {
      return;
    }

    const token = localStorage.getItem('yamy_token');
    if (!token) {
      throw new Error('로그인 후 레시피를 저장할 수 있습니다.');
    }

    isSaving = true;
    elements.draftButton.disabled = true;
    elements.saveButton.disabled = true;

    try {
      const payload = buildPayload(status);
      const response = await fetch(currentRecipeId ? `${API_BASE}/${currentRecipeId}` : API_BASE, {
        method: currentRecipeId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '레시피 저장에 실패했습니다.');
      }

      currentRecipeId = data.recipe.id;
      window.history.replaceState(null, '', `recipe-editor.html?id=${currentRecipeId}`);

      if (status === 'draft') {
        showDraftStatus(data.recipe.updatedAt);
        showAlert('레시피가 임시저장되었습니다.');
        return;
      }

      showAlert('레시피가 공개되었습니다.');
      window.location.href = `recipe-detail.html?id=${data.recipe.id}`;
    } finally {
      isSaving = false;
      elements.draftButton.disabled = false;
      elements.saveButton.disabled = false;
    }
  }

  // 이벤트 리스너 / Event Listeners
  elements.ingredientsList.querySelectorAll('.ingredient-row').forEach(bindIngredientRow);
  elements.stepsList.querySelectorAll('.step-card').forEach(bindStepCard);
  updateStepNumbers();

  elements.thumbnailDropzone?.addEventListener('click', () => {
    elements.thumbnailFile?.click();
  });

  elements.thumbnailFile?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await setThumbnailImage(file);
    } catch (error) {
      showAlert(error.message || '이미지 업로드 중 오류가 발생했습니다.');
    }
  });

  bindDropzone(elements.thumbnailDropzone, setThumbnailImage);

  elements.addIngredientButton?.addEventListener('click', addIngredientRow);
  elements.addStepButton?.addEventListener('click', addStepCard);
  elements.resetButton?.addEventListener('click', resetEditor);
  elements.draftButton?.addEventListener('click', async () => {
    try {
      await saveRecipe('draft');
    } catch (error) {
      showAlert(error.message || '임시저장 중 오류가 발생했습니다.');
    }
  });
  elements.saveButton?.addEventListener('click', async () => {
    try {
      await saveRecipe('published');
    } catch (error) {
      showAlert(error.message || '레시피 공개 중 오류가 발생했습니다.');
    }
  });

  loadRecipeForEdit().catch((error) => {
    showAlert(error.message || '레시피를 불러오는 중 오류가 발생했습니다.');
  });
})();
