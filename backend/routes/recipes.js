const express = require('express');
const recipesController = require('../controllers/recipesController');

const router = express.Router();

router.get('/mine', recipesController.getMyRecipes);
router.get('/picks', recipesController.getMyPicks);
router.post('/', recipesController.createRecipe);
router.post('/draft/save', recipesController.saveDraft);
router.put('/drafts/:recipeId', recipesController.updateDraftRecipe);
router.delete('/drafts/:recipeId', recipesController.deleteDraftRecipe);
router.post('/:recipeId/pick', recipesController.pickRecipe);
router.delete('/:recipeId/pick', recipesController.unpickRecipe);
router.put('/:recipeId', recipesController.updateRecipe);
router.get('/:recipeId', recipesController.getRecipe);

module.exports = router;
