const express = require('express');
const recipesController = require('../controllers/recipesController');
const savedRecipesController = require('../controllers/savedRecipesController');

const router = express.Router();

router.get('/mine', recipesController.getMyRecipes);
router.get('/saved', savedRecipesController.getSavedRecipes);
router.post('/', recipesController.createRecipe);
router.get('/:recipeId/saved', savedRecipesController.getSavedStatus);
router.post('/:recipeId/saved', savedRecipesController.saveRecipe);
router.delete('/:recipeId/saved', savedRecipesController.removeSavedRecipe);
router.get('/:recipeId/edit', recipesController.getRecipeForEdit);
router.patch('/:recipeId', recipesController.updateRecipe);
router.delete('/:recipeId', recipesController.deleteRecipe);
router.get('/:recipeId', recipesController.getRecipe);

module.exports = router;
