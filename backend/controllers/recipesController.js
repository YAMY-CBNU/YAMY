const recipesStore = require('../storage/recipesStore');
const usersStore = require('../storage/usersStore');
const { requireAuth } = require('../utils/auth');

const CATEGORY_FIELDS = ['method', 'situation', 'mainIngredient', 'type'];

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeNullableText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeTimerSeconds(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return NaN;
  }

  return Math.floor(number);
}

function validateCategories(categories) {
  const normalized = {
    method: normalizeText(categories?.method),
    situation: normalizeText(categories?.situation),
    mainIngredient: normalizeText(categories?.mainIngredient),
    type: normalizeText(categories?.type),
  };

  for (const field of CATEGORY_FIELDS) {
    if (!normalized[field]) {
      const error = new Error('카테고리 4가지를 모두 선택해주세요.');
      error.status = 400;
      throw error;
    }
  }

  return normalized;
}

function validateIngredients(ingredients) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    const error = new Error('재료를 한 개 이상 입력해주세요.');
    error.status = 400;
    throw error;
  }

  const normalized = ingredients
    .map((ingredient) => ({
      name: normalizeText(ingredient?.name),
      amount: normalizeText(ingredient?.amount),
    }))
    .filter((ingredient) => ingredient.name);

  if (normalized.length === 0) {
    const error = new Error('재료 이름을 한 개 이상 입력해주세요.');
    error.status = 400;
    throw error;
  }

  return normalized;
}

function validateSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    const error = new Error('조리 단계를 한 개 이상 입력해주세요.');
    error.status = 400;
    throw error;
  }

  const normalized = steps
    .map((step) => {
      const timerSeconds = normalizeTimerSeconds(step?.timerSeconds);

      if (Number.isNaN(timerSeconds)) {
        const error = new Error('타이머는 0 이상의 숫자로 입력해주세요.');
        error.status = 400;
        throw error;
      }

      return {
        description: normalizeText(step?.description),
        imageUrl: normalizeNullableText(step?.imageUrl),
        timerSeconds,
      };
    })
    .filter((step) => step.description);

  if (normalized.length === 0) {
    const error = new Error('조리 설명을 한 개 이상 입력해주세요.');
    error.status = 400;
    throw error;
  }

  return normalized;
}

function normalizeDraftCategories(categories) {
  return {
    method: normalizeNullableText(categories?.method),
    situation: normalizeNullableText(categories?.situation),
    mainIngredient: normalizeNullableText(categories?.mainIngredient),
    type: normalizeNullableText(categories?.type),
  };
}

function normalizeDraftIngredients(ingredients) {
  if (!Array.isArray(ingredients)) {
    return [];
  }

  return ingredients
    .map((ingredient) => ({
      name: normalizeText(ingredient?.name),
      amount: normalizeText(ingredient?.amount),
    }))
    .filter((ingredient) => ingredient.name);
}

function normalizeDraftSteps(steps) {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((step) => {
      const timerSeconds = normalizeTimerSeconds(step?.timerSeconds);
      return {
        description: normalizeText(step?.description),
        imageUrl: normalizeNullableText(step?.imageUrl),
        timerSeconds: Number.isNaN(timerSeconds) ? null : timerSeconds,
      };
    })
    .filter((step) => step.description);
}

exports.createRecipe = async (req, res) => {
  try {
    const auth = requireAuth(req);

    const title = normalizeText(req.body.title);
    const description = normalizeText(req.body.description);
    const cookTime = normalizeText(req.body.cookTime);
    const servingSize = normalizeText(req.body.servingSize);
    const difficulty = normalizeText(req.body.difficulty);
    const thumbnailUrl = normalizeNullableText(req.body.thumbnailUrl);
    const categories = validateCategories(req.body.categories);
    const ingredients = validateIngredients(req.body.ingredients);
    const steps = validateSteps(req.body.steps);

    if (!title) {
      return res.status(400).json({ message: '레시피 제목을 입력해주세요.' });
    }

    if (!description) {
      return res.status(400).json({ message: '레시피 설명을 입력해주세요.' });
    }

    if (!cookTime || !servingSize || !difficulty) {
      return res.status(400).json({ message: '조리 시간, 인분, 난이도를 모두 입력해주세요.' });
    }

    const recipe = await recipesStore.createRecipe({
      authorId: auth.userId,
      title,
      description,
      cookTime,
      servingSize,
      difficulty,
      thumbnailUrl,
      categories,
      ingredients,
      steps,
      isDraft: false,
    });

    return res.status(201).json({
      message: '레시피가 저장되었습니다.',
      recipe,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error('Create recipe error:', error);
    return res.status(500).json({ message: '레시피 저장 중 오류가 발생했습니다.' });
  }
};

exports.saveDraft = async (req, res) => {
  return persistDraft(req, res);
};

exports.updateDraftRecipe = async (req, res) => {
  return persistDraft(req, res, Number(req.params.recipeId));
};

async function persistDraft(req, res, recipeId = null) {
  try {
    const auth = requireAuth(req);
    const bodyRecipeId = Number(req.body.recipeId);
    const targetRecipeId = Number.isInteger(recipeId) && recipeId > 0 ? recipeId : bodyRecipeId;

    const title = normalizeText(req.body.title);
    const description = normalizeNullableText(req.body.description);
    const cookTime = normalizeNullableText(req.body.cookTime);
    const servingSize = normalizeNullableText(req.body.servingSize);
    const difficulty = normalizeNullableText(req.body.difficulty);
    const thumbnailUrl = normalizeNullableText(req.body.thumbnailUrl);

    const categories = normalizeDraftCategories(req.body.categories || {});
    const ingredients = normalizeDraftIngredients(req.body.ingredients || []);
    const steps = normalizeDraftSteps(req.body.steps || []);

    if (Number.isInteger(targetRecipeId) && targetRecipeId > 0) {
      const existingRecipe = await recipesStore.findRecipeById(targetRecipeId);

      if (!existingRecipe) {
        return res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
      }

      if (Number(existingRecipe.authorId) !== Number(auth.userId)) {
        return res.status(403).json({ message: '본인의 레시피만 수정할 수 있습니다.' });
      }
    }

    if (!title) {
      return res.status(400).json({ message: '레시피 제목을 입력해주세요.' });
    }

    const payload = {
      authorId: auth.userId,
      title,
      description,
      cookTime,
      servingSize,
      difficulty,
      thumbnailUrl,
      categories,
      ingredients,
      steps,
      isDraft: true,
    };

    const recipe = Number.isInteger(targetRecipeId) && targetRecipeId > 0
      ? await recipesStore.updateRecipeById(targetRecipeId, payload)
      : await recipesStore.createRecipe(payload);

    if (!recipe) {
      return res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    }

    return res.status(201).json({
      message: '임시저장되었습니다.',
      recipe,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error('Save draft error:', error);
    return res.status(500).json({ message: '임시저장 중 오류가 발생했습니다.' });
  }
};

exports.updateRecipe = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = Number(req.params.recipeId);

    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: '올바른 레시피 ID가 아닙니다.' });
    }

    const existingRecipe = await recipesStore.findRecipeById(recipeId);
    if (!existingRecipe) {
      return res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    }

    if (Number(existingRecipe.authorId) !== Number(auth.userId)) {
      return res.status(403).json({ message: '본인의 레시피만 수정할 수 있습니다.' });
    }

    const draftMode = Boolean(req.body.isDraft);
    const title = normalizeText(req.body.title);
    const description = draftMode ? normalizeNullableText(req.body.description) : normalizeText(req.body.description);
    const cookTime = draftMode ? normalizeNullableText(req.body.cookTime) : normalizeText(req.body.cookTime);
    const servingSize = draftMode ? normalizeNullableText(req.body.servingSize) : normalizeText(req.body.servingSize);
    const difficulty = draftMode ? normalizeNullableText(req.body.difficulty) : normalizeText(req.body.difficulty);
    const thumbnailUrl = normalizeNullableText(req.body.thumbnailUrl);

    const categories = draftMode
      ? normalizeDraftCategories(req.body.categories || {})
      : validateCategories(req.body.categories);

    const ingredients = draftMode
      ? normalizeDraftIngredients(req.body.ingredients || [])
      : validateIngredients(req.body.ingredients);

    const steps = draftMode
      ? normalizeDraftSteps(req.body.steps || [])
      : validateSteps(req.body.steps);

    if (!title) {
      return res.status(400).json({ message: '레시피 제목을 입력해주세요.' });
    }

    if (!draftMode) {
      if (!description) {
        return res.status(400).json({ message: '레시피 설명을 입력해주세요.' });
      }

      if (!cookTime || !servingSize || !difficulty) {
        return res.status(400).json({ message: '조리 시간, 인분, 난이도를 모두 입력해주세요.' });
      }
    }

    const recipe = await recipesStore.updateRecipeById(recipeId, {
      authorId: auth.userId,
      title,
      description,
      cookTime,
      servingSize,
      difficulty,
      thumbnailUrl,
      categories,
      ingredients,
      steps,
      isDraft: draftMode,
    });

    return res.status(200).json({
      message: draftMode ? '임시저장되었습니다.' : '레시피가 저장되었습니다.',
      recipe,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error('Update recipe error:', error);
    return res.status(500).json({ message: '레시피 수정 중 오류가 발생했습니다.' });
  }
};

exports.getRecipe = async (req, res) => {
  try {
    const recipeId = Number(req.params.recipeId);

    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: '올바른 레시피 ID가 아닙니다.' });
    }

    const recipe = await recipesStore.findRecipeById(recipeId);

    if (!recipe) {
      return res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    }

    return res.status(200).json({ recipe });
  } catch (error) {
    console.error('Get recipe error:', error);
    return res.status(500).json({ message: '레시피 조회 중 오류가 발생했습니다.' });
  }
};

exports.getMyRecipes = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const allRecipes = await recipesStore.listRecipesByAuthor(auth.userId);

    const recipes = {
      published: allRecipes.filter((r) => !r.isDraft),
      drafts: allRecipes.filter((r) => r.isDraft),
    };

    return res.status(200).json({ recipes });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error('Get my recipes error:', error);
    return res.status(500).json({ message: '내 레시피 조회 중 오류가 발생했습니다.' });
  }
};

exports.deleteDraftRecipe = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = Number(req.params.recipeId);

    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: '올바른 레시피 ID가 아닙니다.' });
    }

    const recipe = await recipesStore.findRecipeById(recipeId);

    if (!recipe) {
      return res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    }

    if (Number(recipe.authorId) !== Number(auth.userId)) {
      return res.status(403).json({ message: '본인의 레시피만 삭제할 수 있습니다.' });
    }

    if (!recipe.isDraft) {
      return res.status(400).json({ message: '임시저장된 레시피만 삭제할 수 있습니다.' });
    }

    await recipesStore.deleteRecipeById(recipeId);

    return res.status(200).json({ message: '임시저장 레시피가 삭제되었습니다.' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error('Delete draft recipe error:', error);
    return res.status(500).json({ message: '임시저장 레시피 삭제 중 오류가 발생했습니다.' });
  }
};

exports.pickRecipe = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = Number(req.params.recipeId);
    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: '올바른 레시피 ID가 아닙니다.' });
    }
    await usersStore.addPick(auth.userId, recipeId);
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: '저장 중 오류가 발생했습니다.' });
  }
};

exports.unpickRecipe = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = Number(req.params.recipeId);
    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: '올바른 레시피 ID가 아닙니다.' });
    }
    await usersStore.removePick(auth.userId, recipeId);
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: '저장 해제 중 오류가 발생했습니다.' });
  }
};

exports.getMyPicks = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const picks = await usersStore.getPicks(auth.userId);
    return res.status(200).json({ picks });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: '조회 중 오류가 발생했습니다.' });
  }
};
