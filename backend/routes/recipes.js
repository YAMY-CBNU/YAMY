const express = require('express');
const recipesController = require('../controllers/recipesController');

const router = express.Router();

router.post('/', recipesController.createRecipe);
router.get('/:recipeId', recipesController.getRecipe);

module.exports = router;
