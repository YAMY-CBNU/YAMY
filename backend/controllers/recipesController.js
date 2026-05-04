const recipesStore = require('../storage/recipesStore');
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
