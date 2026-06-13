const fs = require('fs/promises');
const path = require('path');
const mysqlPool = require('../config/db');
const recipesStore = require('./recipesStore');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'ratings.json');

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readRatings() {
  await ensureDataFile();
  return JSON.parse((await fs.readFile(DATA_FILE, 'utf8')) || '[]');
}

async function writeRatings(ratings) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(ratings, null, 2), 'utf8');
}

async function getSummary(recipeId) {
  const mode = await recipesStore.getMode();

  if (mode === 'mysql') {
    const [rows] = await mysqlPool.query(
      `SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS average_rating
       FROM RECIPE_RATING
       WHERE recipe_id = ?`,
      [recipeId]
    );
    return {
      count: Number(rows[0].count),
      averageRating: Number(Number(rows[0].average_rating).toFixed(1)),
    };
  }

  const ratings = (await readRatings()).filter(
    (item) => Number(item.recipe_id) === Number(recipeId)
  );
  const average = ratings.length
    ? ratings.reduce((sum, item) => sum + Number(item.rating), 0) / ratings.length
    : 0;

  return {
    count: ratings.length,
    averageRating: Number(average.toFixed(1)),
  };
}

async function getUserRating(recipeId, userId) {
  const mode = await recipesStore.getMode();

  if (mode === 'mysql') {
    const [rows] = await mysqlPool.query(
      'SELECT rating FROM RECIPE_RATING WHERE recipe_id = ? AND user_id = ? LIMIT 1',
      [recipeId, userId]
    );
    return rows[0] ? Number(rows[0].rating) : 0;
  }

  const ratings = await readRatings();
  const rating = ratings.find(
    (item) => Number(item.recipe_id) === Number(recipeId)
      && Number(item.user_id) === Number(userId)
  );
  return rating ? Number(rating.rating) : 0;
}

async function setRating(recipeId, userId, rating) {
  const mode = await recipesStore.getMode();

  if (mode === 'mysql') {
    await mysqlPool.query(
      `INSERT INTO RECIPE_RATING (recipe_id, user_id, rating)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), updated_at = CURRENT_TIMESTAMP`,
      [recipeId, userId, rating]
    );
    return rating;
  }

  const ratings = await readRatings();
  const index = ratings.findIndex(
    (item) => Number(item.recipe_id) === Number(recipeId)
      && Number(item.user_id) === Number(userId)
  );
  const now = new Date().toISOString();
  const record = {
    recipe_id: Number(recipeId),
    user_id: Number(userId),
    rating,
    updated_at: now,
  };

  if (index === -1) {
    ratings.push({ ...record, created_at: now });
  } else {
    ratings[index] = { ...ratings[index], ...record };
  }
  await writeRatings(ratings);
  return rating;
}

async function removeAllForRecipe(recipeId) {
  const mode = await recipesStore.getMode();
  if (mode === 'mysql') {
    await mysqlPool.query('DELETE FROM RECIPE_RATING WHERE recipe_id = ?', [recipeId]);
    return;
  }

  const ratings = await readRatings();
  const remaining = ratings.filter(
    (item) => Number(item.recipe_id) !== Number(recipeId)
  );
  if (remaining.length !== ratings.length) await writeRatings(remaining);
}

module.exports = {
  getSummary,
  getUserRating,
  setRating,
  removeAllForRecipe,
};
