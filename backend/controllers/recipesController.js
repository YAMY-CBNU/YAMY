const recipesStore = require('../storage/recipesStore');
const savedRecipesStore = require('../storage/savedRecipesStore');
const ratingsStore = require('../storage/ratingsStore');
const commentsStore = require('../storage/commentsStore');
const { requireAuth } = require('../utils/auth');

const CATEGORY_FIELDS = ['method', 'situation', 'mainIngredient', 'type'];
const RECIPE_STATUSES = new Set(['draft', 'published']);

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeNullableText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeStatus(value) {
  const status = normalizeText(value) || 'published';
  if (!RECIPE_STATUSES.has(status)) {
    const error = new Error('올바른 레시피 상태가 아닙니다.');
    error.status = 400;
    throw error;
  }
  return status;
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

function normalizeCategories(categories, required) {
  const normalized = {
    method: normalizeText(categories?.method),
    situation: normalizeText(categories?.situation),
    mainIngredient: normalizeText(categories?.mainIngredient),
    type: normalizeText(categories?.type),
  };

  if (required) {
    for (const field of CATEGORY_FIELDS) {
      if (!normalized[field]) {
        const error = new Error('카테고리 4가지를 모두 선택해주세요.');
        error.status = 400;
        throw error;
      }
    }
  }

  return normalized;
}

function normalizeIngredients(ingredients, required) {
  const normalized = (Array.isArray(ingredients) ? ingredients : [])
    .map((ingredient) => ({
      name: normalizeText(ingredient?.name),
      amount: normalizeText(ingredient?.amount),
    }))
    .filter((ingredient) => (
      required ? ingredient.name : ingredient.name || ingredient.amount
    ));

  if (required && normalized.length === 0) {
    const error = new Error('재료 이름을 한 개 이상 입력해주세요.');
    error.status = 400;
    throw error;
  }

  return normalized;
}

function normalizeTips(tips) {
  return (Array.isArray(tips) ? tips : [])
    .map(normalizeText)
    .filter(Boolean);
}

function normalizeSteps(steps, required) {
  const normalized = (Array.isArray(steps) ? steps : [])
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
    .filter((step) => (
      required
        ? step.description
        : step.description || step.imageUrl || step.timerSeconds !== null
    ));

  if (required && normalized.length === 0) {
    const error = new Error('조리 설명을 한 개 이상 입력해주세요.');
    error.status = 400;
    throw error;
  }

  return normalized;
}

function buildRecipePayload(body, authorId, options = {}) {
  const status = normalizeStatus(body.status);
  const isPublished = status === 'published';
  const requiresCompleteRecipe = isPublished && !options.allowIncomplete;
  const payload = {
    authorId,
    status,
    title: normalizeText(body.title),
    description: normalizeText(body.description),
    cookTime: normalizeText(body.cookTime),
    servingSize: normalizeText(body.servingSize),
    difficulty: normalizeText(body.difficulty),
    thumbnailUrl: normalizeNullableText(body.thumbnailUrl),
    categories: normalizeCategories(body.categories, requiresCompleteRecipe),
    ingredients: normalizeIngredients(body.ingredients, requiresCompleteRecipe),
    steps: normalizeSteps(body.steps, requiresCompleteRecipe),
    tips: normalizeTips(body.tips),
  };

  if (isPublished && !payload.title) {
    const error = new Error('레시피 제목을 입력해주세요.');
    error.status = 400;
    throw error;
  }

  if (requiresCompleteRecipe && !payload.description) {
    const error = new Error('레시피 설명을 입력해주세요.');
    error.status = 400;
    throw error;
  }

  if (
    requiresCompleteRecipe &&
    (!payload.cookTime || !payload.servingSize || !payload.difficulty)
  ) {
    const error = new Error('조리 시간, 인분, 난이도를 모두 입력해주세요.');
    error.status = 400;
    throw error;
  }

  return payload;
}

function parseRecipeId(value) {
  const recipeId = Number(value);
  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    const error = new Error('올바른 레시피 ID가 아닙니다.');
    error.status = 400;
    throw error;
  }
  return recipeId;
}

function assertCanManageRecipe(recipe, auth) {
  if (!recipe) {
    const error = new Error('레시피를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  if (
    auth.role !== 'admin'
    && Number(recipe.authorId) !== Number(auth.userId)
  ) {
    const error = new Error('이 레시피를 관리할 권한이 없습니다.');
    error.status = 403;
    throw error;
  }
}

function sendError(res, error, context, fallbackMessage) {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(context, error);
  return res.status(500).json({ message: fallbackMessage });
}

exports.createRecipe = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const payload = buildRecipePayload(req.body, auth.userId);
    const recipe = await recipesStore.createRecipe(payload);

    return res.status(201).json({
      message: payload.status === 'draft'
        ? '레시피가 임시저장되었습니다.'
        : '레시피가 공개되었습니다.',
      recipe,
    });
  } catch (error) {
    return sendError(res, error, 'Create recipe error:', '레시피 저장 중 오류가 발생했습니다.');
  }
};

exports.updateRecipe = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseRecipeId(req.params.recipeId);
    const existingRecipe = await recipesStore.findRecipeById(recipeId);
    assertCanManageRecipe(existingRecipe, auth);

    const payload = buildRecipePayload(req.body, auth.userId, {
      allowIncomplete: auth.role === 'admin',
    });
    const recipe = await recipesStore.updateRecipe(recipeId, payload);

    return res.status(200).json({
      message: payload.status === 'draft'
        ? '레시피가 임시저장되었습니다.'
        : '레시피가 공개되었습니다.',
      recipe,
    });
  } catch (error) {
    return sendError(res, error, 'Update recipe error:', '레시피 수정 중 오류가 발생했습니다.');
  }
};

exports.deleteRecipe = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseRecipeId(req.params.recipeId);
    const existingRecipe = await recipesStore.findRecipeById(recipeId);
    assertCanManageRecipe(existingRecipe, auth);

    const deleted = await recipesStore.deleteRecipe(recipeId);
    if (!deleted) {
      return res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    }

    try {
      await savedRecipesStore.removeAllForRecipe(recipeId);
    } catch (cleanupError) {
      console.error('Delete saved recipe records error:', cleanupError);
    }

    try {
      await ratingsStore.removeAllForRecipe(recipeId);
      await commentsStore.removeAllForRecipe(recipeId);
    } catch (cleanupError) {
      console.error('Delete recipe feedback records error:', cleanupError);
    }

    return res.status(200).json({ message: '레시피가 삭제되었습니다.' });
  } catch (error) {
    return sendError(res, error, 'Delete recipe error:', '레시피 삭제 중 오류가 발생했습니다.');
  }
};

exports.getRecipe = async (req, res) => {
  try {
    const recipeId = parseRecipeId(req.params.recipeId);
    const recipe = await recipesStore.findRecipeById(recipeId);

    if (!recipe || recipe.status !== 'published') {
      return res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    }

    return res.status(200).json({ recipe });
  } catch (error) {
    return sendError(res, error, 'Get recipe error:', '레시피 조회 중 오류가 발생했습니다.');
  }
};

exports.getRecipeForEdit = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseRecipeId(req.params.recipeId);
    const recipe = await recipesStore.findRecipeById(recipeId);
    assertCanManageRecipe(recipe, auth);

    return res.status(200).json({ recipe });
  } catch (error) {
    return sendError(
      res,
      error,
      'Get recipe for edit error:',
      '레시피 편집 정보를 불러오는 중 오류가 발생했습니다.'
    );
  }
};

exports.getMyRecipes = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipes = auth.role === 'admin'
      ? await recipesStore.listAllRecipes()
      : await recipesStore.listRecipesByAuthor(auth.userId);
    return res.status(200).json({ recipes });
  } catch (error) {
    return sendError(res, error, 'Get my recipes error:', '내 레시피 조회 중 오류가 발생했습니다.');
  }
};

exports.getPublishedRecipes = async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 20)
      : 8;
    const recipes = await recipesStore.listPublishedRecipes(limit);
    return res.status(200).json({ recipes });
  } catch (error) {
    return sendError(
      res,
      error,
      'Get published recipes error:',
      '최근 레시피를 불러오는 중 오류가 발생했습니다.'
    );
  }
};

exports.getPopularRecipes = async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 20)
      : 8;
    const recipes = await recipesStore.listPopularRecipes(limit);
    return res.status(200).json({ recipes });
  } catch (error) {
    return sendError(
      res,
      error,
      'Get popular recipes error:',
      '인기 레시피를 불러오는 중 오류가 발생했습니다.'
    );
  }
};

exports.getRecommendedRecipes = async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 20)
      : 12;
    const recipes = await recipesStore.listRandomPublishedRecipes(limit);
    return res.status(200).json({ recipes });
  } catch (error) {
    return sendError(
      res,
      error,
      'Get recommended recipes error:',
      '오늘의 추천 레시피를 불러오는 중 오류가 발생했습니다.'
    );
  }
};

exports.searchRecipes = async (req, res) => {
  try {
    const query = normalizeText(req.query.q);
    if (!query) {
      return res.status(400).json({ message: '검색어를 입력해 주세요.' });
    }
    if (query.length > 100) {
      return res.status(400).json({ message: '검색어는 100자 이내로 입력해 주세요.' });
    }

    const requestedLimit = Number(req.query.limit);
    const requestedOffset = Number(req.query.offset);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 20)
      : 20;
    const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0
      ? requestedOffset
      : 0;
    const result = await recipesStore.searchPublishedRecipes(query, limit, offset);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(
      res,
      error,
      'Search recipes error:',
      '레시피 검색 중 오류가 발생했습니다.'
    );
  }
};
