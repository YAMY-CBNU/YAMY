const fs = require('fs/promises');
const path = require('path');
const mysqlPool = require('../config/db');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'recipes.json');
const RATINGS_DATA_FILE = path.join(DATA_DIR, 'ratings.json');

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

async function readRecipeRatings() {
  try {
    const raw = await fs.readFile(RATINGS_DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function detectMode() {
  try {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.query('SELECT 1');
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

function mapRecipeRecord(recipe, ingredients = [], steps = [], tips = []) {
  const mappedTips = tips.length > 0
    ? tips.map((tip) => (typeof tip === 'string' ? tip : tip.content)).filter(Boolean)
    : steps.map((step) => step.tip).filter(Boolean);

  return {
    id: recipe.recipe_id,
    authorId: recipe.author_id,
    externalRecipeId: recipe.external_recipe_id || null,
    sourceUrl: recipe.source_url || null,
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
      tip: step.tip || null,
    })),
    tips: mappedTips,
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
    })),
    tips: payload.tips.map((tip, index) => ({
      tip_id: index + 1,
      tip_order: index + 1,
      content: tip,
    })),
  };
}

function buildExternalFileRecord(recipeId, recipe, createdAt) {
  const now = new Date().toISOString();

  return {
    recipe_id: recipeId,
    author_id: null,
    external_recipe_id: recipe.externalRecipeId,
    source_url: recipe.sourceUrl,
    status: 'published',
    title: recipe.title,
    description: recipe.description,
    thumbnail_url: recipe.thumbnailUrl,
    difficulty: recipe.difficulty,
    serving_size: recipe.servingSize,
    cook_time: recipe.cookTime,
    cat1_method: recipe.categories.method,
    cat2_situation: recipe.categories.situation,
    cat3_ingredient: recipe.categories.mainIngredient,
    cat4_type: recipe.categories.type,
    is_external: true,
    created_at: createdAt || now,
    updated_at: now,
    ingredients: recipe.ingredients.map((ingredient, index) => ({
      ingredient_id: index + 1,
      name: ingredient.name,
      amount: ingredient.amount,
      section: ingredient.section,
    })),
    steps: recipe.steps.map((step, index) => ({
      step_id: index + 1,
      step_order: step.order,
      description: step.description,
      image_url: step.imageUrl,
      timer_seconds: step.timerSeconds,
      heat_level: step.heatLevel,
      tip: step.tip,
    })),
    tips: [],
  };
}

async function importExternalRecipesToFile(importedRecipes) {
  const recipes = await readRecipes();
  const externalIndex = new Map();
  let nextRecipeId =
    recipes.reduce((maxId, recipe) => Math.max(maxId, Number(recipe.recipe_id) || 0), 0) + 1;

  recipes.forEach((recipe, index) => {
    if (recipe.external_recipe_id) {
      externalIndex.set(String(recipe.external_recipe_id), index);
    }
  });

  let created = 0;
  let updated = 0;

  for (const recipe of importedRecipes) {
    const existingIndex = externalIndex.get(String(recipe.externalRecipeId));

    if (existingIndex === undefined) {
      const record = buildExternalFileRecord(nextRecipeId, recipe);
      externalIndex.set(String(recipe.externalRecipeId), recipes.length);
      recipes.push(record);
      nextRecipeId += 1;
      created += 1;
      continue;
    }

    const existing = recipes[existingIndex];
    recipes[existingIndex] = buildExternalFileRecord(
      existing.recipe_id,
      recipe,
      existing.created_at
    );
    updated += 1;
  }

  await writeRecipes(recipes);
  return { mode: 'file', created, updated, total: importedRecipes.length };
}

async function insertExternalChildren(connection, recipeId, recipe) {
  for (const ingredient of recipe.ingredients) {
    await connection.query(
      `INSERT INTO RECIPE_INGREDIENT (recipe_id, section, name, amount)
       VALUES (?, ?, ?, ?)`,
      [recipeId, ingredient.section, ingredient.name, ingredient.amount]
    );
  }

  for (const step of recipe.steps) {
    await connection.query(
      `INSERT INTO RECIPE_STEP (
        recipe_id,
        step_order,
        description,
        image_url,
        heat_level,
        timer_seconds,
        tip
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        recipeId,
        step.order,
        step.description,
        step.imageUrl,
        step.heatLevel,
        step.timerSeconds,
        step.tip,
      ]
    );
  }
}

async function importExternalRecipesToMysql(importedRecipes) {
  const connection = await mysqlPool.getConnection();
  let created = 0;
  let updated = 0;

  try {
    await connection.beginTransaction();

    for (const recipe of importedRecipes) {
      const [result] = await connection.query(
        `INSERT INTO RECIPE (
          author_id,
          external_recipe_id,
          source_url,
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
        ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', TRUE)
        ON DUPLICATE KEY UPDATE
          recipe_id = LAST_INSERT_ID(recipe_id),
          source_url = VALUES(source_url),
          title = VALUES(title),
          description = VALUES(description),
          thumbnail_url = VALUES(thumbnail_url),
          difficulty = VALUES(difficulty),
          serving_size = VALUES(serving_size),
          cook_time = VALUES(cook_time),
          cat1_method = VALUES(cat1_method),
          cat2_situation = VALUES(cat2_situation),
          cat3_ingredient = VALUES(cat3_ingredient),
          cat4_type = VALUES(cat4_type),
          status = 'published',
          is_external = TRUE`,
        [
          recipe.externalRecipeId,
          recipe.sourceUrl,
          recipe.title,
          recipe.description,
          recipe.thumbnailUrl,
          recipe.difficulty,
          recipe.servingSize,
          recipe.cookTime,
          recipe.categories.method,
          recipe.categories.situation,
          recipe.categories.mainIngredient,
          recipe.categories.type,
        ]
      );

      const recipeId = result.insertId;
      if (result.affectedRows === 1) {
        created += 1;
      } else {
        updated += 1;
      }

      await connection.query('DELETE FROM RECIPE_INGREDIENT WHERE recipe_id = ?', [recipeId]);
      await connection.query('DELETE FROM RECIPE_STEP WHERE recipe_id = ?', [recipeId]);
      await connection.query('DELETE FROM RECIPE_TIP WHERE recipe_id = ?', [recipeId]);
      await insertExternalChildren(connection, recipeId, recipe);
    }

    await connection.commit();
    return { mode: 'mysql', created, updated, total: importedRecipes.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function importExternalRecipes(importedRecipes) {
  const mode = await getMode();
  return mode === 'mysql'
    ? importExternalRecipesToMysql(importedRecipes)
    : importExternalRecipesToFile(importedRecipes);
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

  for (const [index, tip] of payload.tips.entries()) {
    await connection.query(
      'INSERT INTO RECIPE_TIP (recipe_id, tip_order, content) VALUES (?, ?, ?)',
      [recipeId, index + 1, tip]
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
  return mapRecipeRecord(
    recipeRecord,
    recipeRecord.ingredients,
    recipeRecord.steps,
    recipeRecord.tips
  );
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
      await connection.query('DELETE FROM RECIPE_TIP WHERE recipe_id = ?', [recipeId]);
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
  return mapRecipeRecord(
    recipeRecord,
    recipeRecord.ingredients,
    recipeRecord.steps,
    recipeRecord.tips
  );
}

async function deleteRecipe(recipeId) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const [result] = await mysqlPool.query(
      'DELETE FROM RECIPE WHERE recipe_id = ?',
      [recipeId]
    );
    return result.affectedRows > 0;
  }

  const recipes = await readRecipes();
  const remainingRecipes = recipes.filter(
    (recipe) => Number(recipe.recipe_id) !== Number(recipeId)
  );

  if (remainingRecipes.length === recipes.length) {
    return false;
  }

  await writeRecipes(remainingRecipes);
  return true;
}

async function findRecipeById(recipeId) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const [recipeRows] = await mysqlPool.query(
      `SELECT
        recipe_id,
        author_id,
        external_recipe_id,
        source_url,
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
    const [tipRows] = await mysqlPool.query(
      `SELECT tip_id, tip_order, content
       FROM RECIPE_TIP
       WHERE recipe_id = ?
       ORDER BY tip_order ASC, tip_id ASC`,
      [recipeId]
    );

    return mapRecipeRecord(recipe, ingredientRows, stepRows, tipRows);
  }

  const recipes = await readRecipes();
  const recipe = recipes.find((item) => Number(item.recipe_id) === Number(recipeId));
  return recipe
    ? mapRecipeRecord(
      recipe,
      recipe.ingredients || [],
      recipe.steps || [],
      recipe.tips || []
    )
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
    .map((recipe) => mapRecipeRecord(
      recipe,
      recipe.ingredients || [],
      recipe.steps || [],
      recipe.tips || []
    ));
}

async function listAllRecipes() {
  const mode = await getMode();

  if (mode === 'mysql') {
    const [recipeRows] = await mysqlPool.query(
      `SELECT
        recipe_id,
        author_id,
        external_recipe_id,
        source_url,
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
       ORDER BY updated_at DESC, recipe_id DESC`
    );
    return recipeRows.map((recipe) => mapRecipeRecord(recipe));
  }

  const recipes = await readRecipes();
  return recipes
    .sort((a, b) => (
      new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
      || Number(b.recipe_id) - Number(a.recipe_id)
    ))
    .map((recipe) => mapRecipeRecord(
      recipe,
      recipe.ingredients || [],
      recipe.steps || [],
      recipe.tips || []
    ));
}

async function listPublishedRecipes(limit = 8) {
  const mode = await getMode();
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);

  if (mode === 'mysql') {
    const [recipeRows] = await mysqlPool.query(
      `SELECT
        recipe.recipe_id,
        recipe.author_id,
        recipe.external_recipe_id,
        recipe.source_url,
        recipe.title,
        recipe.description,
        recipe.thumbnail_url,
        recipe.difficulty,
        recipe.serving_size,
        recipe.cook_time,
        recipe.cat1_method,
        recipe.cat2_situation,
        recipe.cat3_ingredient,
        recipe.cat4_type,
        recipe.status,
        recipe.is_external,
        recipe.created_at,
        recipe.updated_at,
        COALESCE(rating_summary.rating_count, 0) AS rating_count,
        COALESCE(rating_summary.average_rating, 0) AS average_rating
       FROM RECIPE recipe
       LEFT JOIN (
         SELECT recipe_id, COUNT(*) AS rating_count, AVG(rating) AS average_rating
         FROM RECIPE_RATING
         GROUP BY recipe_id
       ) rating_summary ON rating_summary.recipe_id = recipe.recipe_id
       WHERE recipe.status = 'published'
       ORDER BY recipe.created_at DESC, recipe.recipe_id DESC
       LIMIT ?`,
      [safeLimit]
    );

    return recipeRows.map((recipe) => ({
      ...mapRecipeRecord(recipe),
      ratingSummary: {
        count: Number(recipe.rating_count),
        averageRating: Number(Number(recipe.average_rating).toFixed(1)),
      },
    }));
  }

  const recipes = await readRecipes();
  const ratings = await readRecipeRatings();
  return recipes
    .filter((recipe) => (recipe.status || 'published') === 'published')
    .sort((a, b) => (
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
      || Number(b.recipe_id) - Number(a.recipe_id)
    ))
    .slice(0, safeLimit)
    .map((recipe) => {
      const recipeRatings = ratings.filter(
        (rating) => Number(rating.recipe_id) === Number(recipe.recipe_id)
      );
      const averageRating = recipeRatings.length
        ? recipeRatings.reduce((sum, rating) => sum + Number(rating.rating), 0) / recipeRatings.length
        : 0;

      return {
        ...mapRecipeRecord(
          recipe,
          recipe.ingredients || [],
          recipe.steps || [],
          recipe.tips || []
        ),
        ratingSummary: {
          count: recipeRatings.length,
          averageRating: Number(averageRating.toFixed(1)),
        },
      };
    });
}

async function listPopularRecipes(limit = 8) {
  const mode = await getMode();
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);

  if (mode === 'mysql') {
    const [recipeRows] = await mysqlPool.query(
      `SELECT
        recipe.recipe_id,
        recipe.author_id,
        recipe.external_recipe_id,
        recipe.source_url,
        recipe.title,
        recipe.description,
        recipe.thumbnail_url,
        recipe.difficulty,
        recipe.serving_size,
        recipe.cook_time,
        recipe.cat1_method,
        recipe.cat2_situation,
        recipe.cat3_ingredient,
        recipe.cat4_type,
        recipe.status,
        recipe.is_external,
        recipe.created_at,
        recipe.updated_at,
        COALESCE(rating_summary.rating_count, 0) AS rating_count,
        COALESCE(rating_summary.average_rating, 0) AS average_rating
       FROM RECIPE recipe
       LEFT JOIN (
         SELECT recipe_id, COUNT(*) AS rating_count, AVG(rating) AS average_rating
         FROM RECIPE_RATING
         GROUP BY recipe_id
       ) rating_summary ON rating_summary.recipe_id = recipe.recipe_id
       WHERE recipe.status = 'published'
       ORDER BY
         average_rating DESC,
         rating_count DESC,
         recipe.created_at DESC,
         recipe.recipe_id DESC
       LIMIT ?`,
      [safeLimit]
    );

    return recipeRows.map((recipe) => ({
      ...mapRecipeRecord(recipe),
      ratingSummary: {
        count: Number(recipe.rating_count),
        averageRating: Number(Number(recipe.average_rating).toFixed(1)),
      },
    }));
  }

  const recipes = await readRecipes();
  const ratings = await readRecipeRatings();
  const ratingSummaries = new Map();

  for (const rating of ratings) {
    const recipeId = Number(rating.recipe_id);
    const summary = ratingSummaries.get(recipeId) || { count: 0, total: 0 };
    summary.count += 1;
    summary.total += Number(rating.rating);
    ratingSummaries.set(recipeId, summary);
  }

  return recipes
    .filter((recipe) => (recipe.status || 'published') === 'published')
    .map((recipe) => {
      const summary = ratingSummaries.get(Number(recipe.recipe_id)) || { count: 0, total: 0 };
      const averageRating = summary.count ? summary.total / summary.count : 0;

      return {
        recipe,
        sortAverageRating: averageRating,
        ratingSummary: {
          count: summary.count,
          averageRating: Number(averageRating.toFixed(1)),
        },
      };
    })
    .sort((left, right) => (
      right.sortAverageRating - left.sortAverageRating
      || right.ratingSummary.count - left.ratingSummary.count
      || new Date(right.recipe.created_at || 0) - new Date(left.recipe.created_at || 0)
      || Number(right.recipe.recipe_id) - Number(left.recipe.recipe_id)
    ))
    .slice(0, safeLimit)
    .map(({ recipe, ratingSummary }) => ({
      ...mapRecipeRecord(
        recipe,
        recipe.ingredients || [],
        recipe.steps || [],
        recipe.tips || []
      ),
      ratingSummary,
    }));
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

async function listRandomPublishedRecipes(limit = 12) {
  const mode = await getMode();
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 20);

  if (mode === 'mysql') {
    const [recipeRows] = await mysqlPool.query(
      `SELECT
        recipe_id,
        author_id,
        external_recipe_id,
        source_url,
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
       WHERE status = 'published'
         AND thumbnail_url IS NOT NULL
         AND TRIM(thumbnail_url) <> ''
       ORDER BY RAND()
       LIMIT ?`,
      [safeLimit]
    );
    return recipeRows.map((recipe) => mapRecipeRecord(recipe));
  }

  const recipes = await readRecipes();
  return shuffle(
    recipes.filter((recipe) => (
      (recipe.status || 'published') === 'published'
      && String(recipe.thumbnail_url || '').trim()
    ))
  )
    .slice(0, safeLimit)
    .map((recipe) => mapRecipeRecord(
      recipe,
      recipe.ingredients || [],
      recipe.steps || [],
      recipe.tips || []
    ));
}

module.exports = {
  getMode,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  findRecipeById,
  listRecipesByAuthor,
  listAllRecipes,
  listPublishedRecipes,
  listPopularRecipes,
  listRandomPublishedRecipes,
  importExternalRecipes,
};
