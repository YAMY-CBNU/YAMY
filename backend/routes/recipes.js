const express = require('express');
const recipesController = require('../controllers/recipesController');

const router = express.Router();

router.get('/mine', recipesController.getMyRecipes);
router.post('/', recipesController.createRecipe);
router.get('/:recipeId/edit', recipesController.getRecipeForEdit);
router.patch('/:recipeId', recipesController.updateRecipe);
router.delete('/:recipeId', recipesController.deleteRecipe);
router.get('/:recipeId', recipesController.getRecipe);

module.exports = router;
