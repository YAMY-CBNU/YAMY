const express = require('express');
const recipesController = require('../controllers/recipesController');
const savedRecipesController = require('../controllers/savedRecipesController');
const ratingsController = require('../controllers/ratingsController');
const commentsController = require('../controllers/commentsController');

const router = express.Router();

router.get('/', recipesController.getPublishedRecipes);
router.get('/popular', recipesController.getPopularRecipes);
router.get('/recommendations', recipesController.getRecommendedRecipes);
router.get('/mine', recipesController.getMyRecipes);
router.get('/saved', savedRecipesController.getSavedRecipes);
router.post('/', recipesController.createRecipe);
router.get('/:recipeId/saved', savedRecipesController.getSavedStatus);
router.post('/:recipeId/saved', savedRecipesController.saveRecipe);
router.delete('/:recipeId/saved', savedRecipesController.removeSavedRecipe);
router.get('/:recipeId/ratings', ratingsController.getSummary);
router.get('/:recipeId/ratings/me', ratingsController.getMyRating);
router.put('/:recipeId/ratings/me', ratingsController.setRating);
router.get('/:recipeId/comments', commentsController.listComments);
router.post('/:recipeId/comments', commentsController.createComment);
router.patch('/:recipeId/comments/:commentId', commentsController.updateComment);
router.delete('/:recipeId/comments/:commentId', commentsController.deleteComment);
router.get('/:recipeId/edit', recipesController.getRecipeForEdit);
router.patch('/:recipeId', recipesController.updateRecipe);
router.delete('/:recipeId', recipesController.deleteRecipe);
router.get('/:recipeId', recipesController.getRecipe);

module.exports = router;
