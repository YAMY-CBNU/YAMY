const fs = require('fs/promises');
const path = require('path');
const mysqlPool = require('../config/db');
const recipesStore = require('./recipesStore');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'saved-recipes.json');

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readSavedRecipes() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeSavedRecipes(savedRecipes) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(savedRecipes, null, 2), 'utf8');
}

async function isSaved(userId, recipeId) {
  const mode = await recipesStore.getMode();

  if (mode === 'mysql') {
    const [rows] = await mysqlPool.query(
      'SELECT saved_id FROM SAVED_RECIPE WHERE user_id = ? AND recipe_id = ? LIMIT 1',
      [userId, recipeId]
    );
    return rows.length > 0;
  }

  const savedRecipes = await readSavedRecipes();
  return savedRecipes.some(
    (item) => Number(item.user_id) === Number(userId)
      && Number(item.recipe_id) === Number(recipeId)
  );
}

async function saveRecipe(userId, recipeId) {
  const mode = await recipesStore.getMode();

  if (mode === 'mysql') {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        'INSERT IGNORE INTO SAVED_RECIPE (user_id, recipe_id) VALUES (?, ?)',
        [userId, recipeId]
      );

      if (result.affectedRows > 0) {
        await connection.query(
          'UPDATE RECIPE SET save_count = save_count + 1 WHERE recipe_id = ?',
          [recipeId]
        );
      }

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  const savedRecipes = await readSavedRecipes();
  const exists = savedRecipes.some(
    (item) => Number(item.user_id) === Number(userId)
      && Number(item.recipe_id) === Number(recipeId)
  );

  if (exists) {
    return false;
  }

  savedRecipes.push({
    user_id: Number(userId),
    recipe_id: Number(recipeId),
    saved_at: new Date().toISOString(),
  });
  await writeSavedRecipes(savedRecipes);
  return true;
}

async function removeSavedRecipe(userId, recipeId) {
  const mode = await recipesStore.getMode();

  if (mode === 'mysql') {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        'DELETE FROM SAVED_RECIPE WHERE user_id = ? AND recipe_id = ?',
        [userId, recipeId]
      );

      if (result.affectedRows > 0) {
        await connection.query(
          'UPDATE RECIPE SET save_count = GREATEST(save_count - 1, 0) WHERE recipe_id = ?',
          [recipeId]
        );
      }

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  const savedRecipes = await readSavedRecipes();
  const remaining = savedRecipes.filter(
    (item) => Number(item.user_id) !== Number(userId)
      || Number(item.recipe_id) !== Number(recipeId)
  );

  if (remaining.length === savedRecipes.length) {
    return false;
  }

  await writeSavedRecipes(remaining);
  return true;
}

async function listSavedRecipes(userId) {
  const mode = await recipesStore.getMode();
  let savedRows;

  if (mode === 'mysql') {
    const [rows] = await mysqlPool.query(
      `SELECT recipe_id, saved_at
       FROM SAVED_RECIPE
       WHERE user_id = ?
       ORDER BY saved_at DESC, saved_id DESC`,
      [userId]
    );
    savedRows = rows;
  } else {
    const savedRecipes = await readSavedRecipes();
    savedRows = savedRecipes
      .filter((item) => Number(item.user_id) === Number(userId))
      .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
  }

  const recipes = await Promise.all(savedRows.map(async (savedRow) => {
    const recipe = await recipesStore.findRecipeById(savedRow.recipe_id);
    if (!recipe || recipe.status !== 'published') {
      return null;
    }

    return {
      ...recipe,
      savedAt: savedRow.saved_at,
    };
  }));

  return recipes.filter(Boolean);
}

async function removeAllForRecipe(recipeId) {
  const mode = await recipesStore.getMode();

  if (mode === 'mysql') {
    await mysqlPool.query(
      'DELETE FROM SAVED_RECIPE WHERE recipe_id = ?',
      [recipeId]
    );
    return;
  }

  const savedRecipes = await readSavedRecipes();
  const remaining = savedRecipes.filter(
    (item) => Number(item.recipe_id) !== Number(recipeId)
  );

  if (remaining.length !== savedRecipes.length) {
    await writeSavedRecipes(remaining);
  }
}

module.exports = {
  isSaved,
  saveRecipe,
  removeSavedRecipe,
  listSavedRecipes,
  removeAllForRecipe,
};
