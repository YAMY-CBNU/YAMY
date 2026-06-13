const recipesStore = require('../storage/recipesStore');
const ratingsStore = require('../storage/ratingsStore');
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

async function requirePublishedRecipe(recipeId) {
  const recipe = await recipesStore.findRecipeById(recipeId);
  if (!recipe || recipe.status !== 'published') {
    const error = new Error('레시피를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }
}

function sendError(res, error, context) {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(context, error);
  return res.status(500).json({ message: '별점 처리 중 오류가 발생했습니다.' });
}

exports.getSummary = async (req, res) => {
  try {
    const recipeId = parseRecipeId(req.params.recipeId);
    await requirePublishedRecipe(recipeId);
    return res.status(200).json({
      summary: await ratingsStore.getSummary(recipeId),
    });
  } catch (error) {
    return sendError(res, error, 'Get rating summary error:');
  }
};

exports.getMyRating = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseRecipeId(req.params.recipeId);
    await requirePublishedRecipe(recipeId);
    return res.status(200).json({
      rating: await ratingsStore.getUserRating(recipeId, auth.userId),
    });
  } catch (error) {
    return sendError(res, error, 'Get my rating error:');
  }
};

exports.setRating = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseRecipeId(req.params.recipeId);
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: '별점은 1점부터 5점까지 선택해 주세요.' });
    }
    await requirePublishedRecipe(recipeId);
    await ratingsStore.setRating(recipeId, auth.userId, rating);
    return res.status(200).json({
      message: '별점이 저장되었습니다.',
      rating,
      summary: await ratingsStore.getSummary(recipeId),
    });
  } catch (error) {
    return sendError(res, error, 'Set rating error:');
  }
};
