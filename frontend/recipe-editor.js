(() => {
  const API_BASE = 'http://localhost:3000/api/recipes';

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
    saveButton: document.getElementById('save-recipe-button'),
    ingredientTemplate: document.getElementById('ingredient-row-template'),
    stepTemplate: document.getElementById('step-card-template'),
  };

  function setStatus(message, type = 'error') {
    const colors = type === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-red-200 bg-red-50 text-red-800';

    elements.status.className = `mt-4 rounded-xl border px-4 py-3 text-xs font-semibold ${colors}`;
    elements.status.textContent = message;
    elements.status.classList.remove('hidden');
  }

  function hideStatus() {
    elements.status.classList.add('hidden');
  }

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
        setStatus(error.message || '이미지 업로드 중 오류가 발생했습니다.');
      }
    });
  }

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
        setStatus(error.message || '이미지 업로드 중 오류가 발생했습니다.');
      }
    });

    bindDropzone(dropzone, (file) => setStepImage(card, file));
  }

  function addIngredientRow() {
    const fragment = elements.ingredientTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.ingredient-row');
    bindIngredientRow(row);
    elements.ingredientsList.appendChild(fragment);
  }

  function addStepCard() {
    const fragment = elements.stepTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.step-card');
    bindStepCard(card);
    elements.stepsList.appendChild(fragment);
    updateStepNumbers();
  }

  function gatherIngredients() {
    return Array.from(elements.ingredientsList.querySelectorAll('.ingredient-row'))
      .map((row) => ({
        name: row.querySelector('.ingredient-name')?.value.trim() || '',
        amount: row.querySelector('.ingredient-amount')?.value.trim() || '',
      }))
      .filter((ingredient) => ingredient.name);
  }

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
      .filter((step) => step.description);
  }

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
    hideStatus();
  }

  function buildPayload() {
    return {
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

  async function saveRecipe() {
    const token = localStorage.getItem('yamy_token');
    if (!token) {
      throw new Error('로그인 후 레시피를 저장할 수 있습니다.');
    }

    const payload = buildPayload();
    const response = await fetch(API_BASE, {
      method: 'POST',
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

    setStatus('레시피가 저장되었습니다.', 'success');
    window.setTimeout(() => {
      window.location.href = `recipe-detail.html?id=${data.recipe.id}`;
    }, 500);
  }

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

    hideStatus();
    try {
      await setThumbnailImage(file);
    } catch (error) {
      setStatus(error.message || '이미지 업로드 중 오류가 발생했습니다.');
    }
  });

  bindDropzone(elements.thumbnailDropzone, setThumbnailImage);

  elements.addIngredientButton?.addEventListener('click', addIngredientRow);
  elements.addStepButton?.addEventListener('click', addStepCard);
  elements.resetButton?.addEventListener('click', resetEditor);
  elements.saveButton?.addEventListener('click', async () => {
    hideStatus();
    try {
      await saveRecipe();
    } catch (error) {
      setStatus(error.message || '레시피 저장 중 오류가 발생했습니다.');
    }
  });
})();
