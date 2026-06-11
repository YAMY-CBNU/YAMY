const fs = require('fs/promises');
const path = require('path');
const mysqlPool = require('../config/db');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'recipes.json');

let modePromise;

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readRecipes() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeRecipes(recipes) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(recipes, null, 2), 'utf8');
}

async function detectMode() {
  try {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.query('SELECT 1 FROM RECIPE LIMIT 1');
      return 'mysql';
    } finally {
      connection.release();
    }
  } catch {
    return 'file';
  }
}

async function getMode() {
  if (!modePromise) {
    modePromise = detectMode();
  }
  return modePromise;
}

function mapRecipeRecord(recipe, ingredients = [], steps = []) {
  return {
    id: recipe.recipe_id,
    authorId: recipe.author_id,
    status: recipe.status || 'published',
    title: recipe.title,
    description: recipe.description,
    thumbnailUrl: recipe.thumbnail_url,
    difficulty: recipe.difficulty,
    servingSize: recipe.serving_size,
    cookTime: recipe.cook_time,
    isExternal: Boolean(recipe.is_external),
    categories: {
      method: recipe.cat1_method,
      situation: recipe.cat2_situation,
      mainIngredient: recipe.cat3_ingredient,
      type: recipe.cat4_type,
    },
    ingredients: ingredients.map((ingredient) => ({
      id: ingredient.ingredient_id,
      name: ingredient.name,
      amount: ingredient.amount,
      section: ingredient.section,
    })),
    steps: steps.map((step) => ({
      id: step.step_id,
      order: step.step_order,
      description: step.description,
      imageUrl: step.image_url,
      timerSeconds: step.timer_seconds,
      heatLevel: step.heat_level,
      tip: step.tip,
    })),
    createdAt: recipe.created_at,
    updatedAt: recipe.updated_at,
  };
}

function buildFileRecord(recipeId, payload, createdAt) {
  const now = new Date().toISOString();
  return {
    recipe_id: recipeId,
    author_id: payload.authorId,
    status: payload.status,
    title: payload.title,
    description: payload.description,
    thumbnail_url: payload.thumbnailUrl,
    difficulty: payload.difficulty,
    serving_size: payload.servingSize,
    cook_time: payload.cookTime,
    cat1_method: payload.categories.method,
    cat2_situation: payload.categories.situation,
    cat3_ingredient: payload.categories.mainIngredient,
    cat4_type: payload.categories.type,
    is_external: false,
    created_at: createdAt || now,
    updated_at: now,
    ingredients: payload.ingredients.map((ingredient, index) => ({
      ingredient_id: index + 1,
      name: ingredient.name,
      amount: ingredient.amount,
      section: '재료',
    })),
    steps: payload.steps.map((step, index) => ({
      step_id: index + 1,
      step_order: index + 1,
      description: step.description,
      image_url: step.imageUrl,
      timer_seconds: step.timerSeconds,
      heat_level: null,
      tip: null,
    })),
  };
}

async function insertChildren(connection, recipeId, payload) {
  for (const ingredient of payload.ingredients) {
    await connection.query(
      'INSERT INTO RECIPE_INGREDIENT (recipe_id, name, amount) VALUES (?, ?, ?)',
      [recipeId, ingredient.name, ingredient.amount]
    );
  }

  for (const [index, step] of payload.steps.entries()) {
    await connection.query(
      `INSERT INTO RECIPE_STEP (
        recipe_id,
        step_order,
        description,
        image_url,
        timer_seconds
      ) VALUES (?, ?, ?, ?, ?)`,
      [recipeId, index + 1, step.description, step.imageUrl, step.timerSeconds]
    );
  }
}

async function createRecipe(payload) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const connection = await mysqlPool.getConnection();

    try {
      await connection.beginTransaction();
      const [recipeResult] = await connection.query(
        `INSERT INTO RECIPE (
          author_id,
          title,
          description,
          thumbnail_url,
          difficulty,
          serving_size,
          cook_time,
          cat1_method,
          cat2_situation,
          cat3_ingredient,
          cat4_type,
          status,
          is_external
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
        [
          payload.authorId,
          payload.title,
          payload.description,
          payload.thumbnailUrl,
          payload.difficulty || null,
          payload.servingSize,
          payload.cookTime,
          payload.categories.method,
          payload.categories.situation,
          payload.categories.mainIngredient,
          payload.categories.type,
          payload.status,
        ]
      );

      const recipeId = recipeResult.insertId;
      await insertChildren(connection, recipeId, payload);
      await connection.commit();
      return findRecipeById(recipeId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  const recipes = await readRecipes();
  const nextRecipeId =
    recipes.reduce((maxId, recipe) => Math.max(maxId, Number(recipe.recipe_id) || 0), 0) + 1;
  const recipeRecord = buildFileRecord(nextRecipeId, payload);

  recipes.push(recipeRecord);
  await writeRecipes(recipes);
  return mapRecipeRecord(recipeRecord, recipeRecord.ingredients, recipeRecord.steps);
}

async function updateRecipe(recipeId, payload) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const connection = await mysqlPool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.query(
        `UPDATE RECIPE SET
          title = ?,
          description = ?,
          thumbnail_url = ?,
          difficulty = ?,
          serving_size = ?,
          cook_time = ?,
          cat1_method = ?,
          cat2_situation = ?,
          cat3_ingredient = ?,
          cat4_type = ?,
          status = ?
        WHERE recipe_id = ?`,
        [
          payload.title,
          payload.description,
          payload.thumbnailUrl,
          payload.difficulty || null,
          payload.servingSize,
          payload.cookTime,
          payload.categories.method,
          payload.categories.situation,
          payload.categories.mainIngredient,
          payload.categories.type,
          payload.status,
          recipeId,
        ]
      );
      await connection.query('DELETE FROM RECIPE_INGREDIENT WHERE recipe_id = ?', [recipeId]);
      await connection.query('DELETE FROM RECIPE_STEP WHERE recipe_id = ?', [recipeId]);
      await insertChildren(connection, recipeId, payload);
      await connection.commit();
      return findRecipeById(recipeId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  const recipes = await readRecipes();
  const index = recipes.findIndex((recipe) => Number(recipe.recipe_id) === Number(recipeId));
  if (index === -1) {
    return null;
  }

  const recipeRecord = buildFileRecord(recipeId, payload, recipes[index].created_at);
  recipes[index] = recipeRecord;
  await writeRecipes(recipes);
  return mapRecipeRecord(recipeRecord, recipeRecord.ingredients, recipeRecord.steps);
}

async function findRecipeById(recipeId) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const [recipeRows] = await mysqlPool.query(
      `SELECT
        recipe_id,
        author_id,
        title,
        description,
        thumbnail_url,
        difficulty,
        serving_size,
        cook_time,
        cat1_method,
        cat2_situation,
        cat3_ingredient,
        cat4_type,
        status,
        is_external,
        created_at,
        updated_at
      FROM RECIPE
      WHERE recipe_id = ?
      LIMIT 1`,
      [recipeId]
    );

    const recipe = recipeRows[0];
    if (!recipe) {
      return null;
    }

    const [ingredientRows] = await mysqlPool.query(
      `SELECT ingredient_id, name, amount, section
       FROM RECIPE_INGREDIENT
       WHERE recipe_id = ?
       ORDER BY ingredient_id ASC`,
      [recipeId]
    );
    const [stepRows] = await mysqlPool.query(
      `SELECT step_id, step_order, description, image_url, timer_seconds, heat_level, tip
       FROM RECIPE_STEP
       WHERE recipe_id = ?
       ORDER BY step_order ASC`,
      [recipeId]
    );

    return mapRecipeRecord(recipe, ingredientRows, stepRows);
  }

  const recipes = await readRecipes();
  const recipe = recipes.find((item) => Number(item.recipe_id) === Number(recipeId));
  return recipe
    ? mapRecipeRecord(recipe, recipe.ingredients || [], recipe.steps || [])
    : null;
}

async function listRecipesByAuthor(authorId) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const [recipeRows] = await mysqlPool.query(
      `SELECT
        recipe_id,
        author_id,
        title,
        description,
        thumbnail_url,
        difficulty,
        serving_size,
        cook_time,
        cat1_method,
        cat2_situation,
        cat3_ingredient,
        cat4_type,
        status,
        is_external,
        created_at,
        updated_at
      FROM RECIPE
      WHERE author_id = ?
      ORDER BY updated_at DESC, recipe_id DESC`,
      [authorId]
    );

    return Promise.all(recipeRows.map((recipe) => findRecipeById(recipe.recipe_id)));
  }

  const recipes = await readRecipes();
  return recipes
    .filter((item) => Number(item.author_id) === Number(authorId))
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .map((recipe) => mapRecipeRecord(recipe, recipe.ingredients || [], recipe.steps || []));
}

module.exports = {
  getMode,
  createRecipe,
  updateRecipe,
  findRecipeById,
  listRecipesByAuthor,
};
