const recipesStore = require('../storage/recipesStore');
const savedRecipesStore = require('../storage/savedRecipesStore');
const { requireAuth } = require('../utils/auth');

function parseRecipeId(value) {
  const recipeId = Number(value);
  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    const error = new Error('올바른 레시피 ID가 아닙니다.');
    error.status = 400;
    throw error;
  }
  return recipeId;
}

function sendError(res, error, context) {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(context, error);
  return res.status(500).json({ message: '저장된 레시피 처리 중 오류가 발생했습니다.' });
}

async function requirePublishedRecipe(recipeId) {
  const recipe = await recipesStore.findRecipeById(recipeId);
  if (!recipe || recipe.status !== 'published') {
    const error = new Error('레시피를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }
  return recipe;
}

exports.getSavedRecipes = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipes = await savedRecipesStore.listSavedRecipes(auth.userId);
    return res.status(200).json({ recipes });
  } catch (error) {
    return sendError(res, error, 'Get saved recipes error:');
  }
};

exports.getSavedStatus = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseRecipeId(req.params.recipeId);
    await requirePublishedRecipe(recipeId);
    const saved = await savedRecipesStore.isSaved(auth.userId, recipeId);
    return res.status(200).json({ saved });
  } catch (error) {
    return sendError(res, error, 'Get saved recipe status error:');
  }
};

exports.saveRecipe = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseRecipeId(req.params.recipeId);
    await requirePublishedRecipe(recipeId);
    await savedRecipesStore.saveRecipe(auth.userId, recipeId);
    return res.status(200).json({
      message: '레시피를 저장했습니다.',
      saved: true,
    });
  } catch (error) {
    return sendError(res, error, 'Save recipe error:');
  }
};

exports.removeSavedRecipe = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseRecipeId(req.params.recipeId);
    await savedRecipesStore.removeSavedRecipe(auth.userId, recipeId);
    return res.status(200).json({
      message: '저장된 레시피에서 삭제했습니다.',
      saved: false,
    });
  } catch (error) {
    return sendError(res, error, 'Remove saved recipe error:');
  }
};
