const fs = require('fs/promises');
const path = require('path');
const mysqlPool = require('../config/db');
const recipesStore = require('./recipesStore');
const usersStore = require('./usersStore');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'comments.json');

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readComments() {
  await ensureDataFile();
  return JSON.parse((await fs.readFile(DATA_FILE, 'utf8')) || '[]');
}

async function writeComments(comments) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(comments, null, 2), 'utf8');
}

function mapComment(comment, user) {
  return {
    id: comment.comment_id,
    recipeId: comment.recipe_id,
    author: {
      id: comment.user_id,
      nickname: comment.username || user?.username || '알 수 없는 사용자',
      profileImageUrl: comment.profile_image_url || user?.profile_image_url || null,
    },
    content: comment.content,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  };
}

async function listByRecipe(recipeId) {
  const mode = await recipesStore.getMode();
  if (mode === 'mysql') {
    const [rows] = await mysqlPool.query(
      `SELECT
        comment.comment_id,
        comment.recipe_id,
        comment.user_id,
        comment.content,
        comment.created_at,
        comment.updated_at,
        user.username,
        user.profile_image_url
      FROM RECIPE_COMMENT comment
      INNER JOIN \`USER\` user ON user.user_id = comment.user_id
      WHERE comment.recipe_id = ?
      ORDER BY comment.created_at DESC, comment.comment_id DESC`,
      [recipeId]
    );
    return rows.map((row) => mapComment(row));
  }

  const comments = (await readComments())
    .filter((item) => Number(item.recipe_id) === Number(recipeId))
    .sort((a, b) => (
      new Date(b.created_at) - new Date(a.created_at)
      || Number(b.comment_id) - Number(a.comment_id)
    ));
  return Promise.all(comments.map(async (comment) => (
    mapComment(comment, await usersStore.findById(comment.user_id))
  )));
}

async function findById(commentId) {
  const mode = await recipesStore.getMode();
  if (mode === 'mysql') {
    const [rows] = await mysqlPool.query(
      `SELECT
        comment.comment_id,
        comment.recipe_id,
        comment.user_id,
        comment.content,
        comment.created_at,
        comment.updated_at,
        user.username,
        user.profile_image_url
      FROM RECIPE_COMMENT comment
      INNER JOIN \`USER\` user ON user.user_id = comment.user_id
      WHERE comment.comment_id = ?
      LIMIT 1`,
      [commentId]
    );
    return rows[0] ? mapComment(rows[0]) : null;
  }

  const comment = (await readComments()).find(
    (item) => Number(item.comment_id) === Number(commentId)
  );
  return comment ? mapComment(comment, await usersStore.findById(comment.user_id)) : null;
}

async function createComment({ recipeId, userId, content }) {
  const mode = await recipesStore.getMode();
  if (mode === 'mysql') {
    const [result] = await mysqlPool.query(
      'INSERT INTO RECIPE_COMMENT (recipe_id, user_id, content) VALUES (?, ?, ?)',
      [recipeId, userId, content]
    );
    return findById(result.insertId);
  }

  const comments = await readComments();
  const nextId = comments.reduce(
    (maxId, item) => Math.max(maxId, Number(item.comment_id) || 0),
    0
  ) + 1;
  const now = new Date().toISOString();
  comments.push({
    comment_id: nextId,
    recipe_id: Number(recipeId),
    user_id: Number(userId),
    content,
    created_at: now,
    updated_at: now,
  });
  await writeComments(comments);
  return findById(nextId);
}

async function updateComment(commentId, content) {
  const mode = await recipesStore.getMode();
  if (mode === 'mysql') {
    const [result] = await mysqlPool.query(
      'UPDATE RECIPE_COMMENT SET content = ? WHERE comment_id = ?',
      [content, commentId]
    );
    return result.affectedRows ? findById(commentId) : null;
  }

  const comments = await readComments();
  const index = comments.findIndex(
    (item) => Number(item.comment_id) === Number(commentId)
  );
  if (index === -1) return null;
  comments[index] = {
    ...comments[index],
    content,
    updated_at: new Date().toISOString(),
  };
  await writeComments(comments);
  return findById(commentId);
}

async function deleteComment(commentId) {
  const mode = await recipesStore.getMode();
  if (mode === 'mysql') {
    const [result] = await mysqlPool.query(
      'DELETE FROM RECIPE_COMMENT WHERE comment_id = ?',
      [commentId]
    );
    return result.affectedRows > 0;
  }

  const comments = await readComments();
  const remaining = comments.filter(
    (item) => Number(item.comment_id) !== Number(commentId)
  );
  if (remaining.length === comments.length) return false;
  await writeComments(remaining);
  return true;
}

async function removeAllForRecipe(recipeId) {
  const mode = await recipesStore.getMode();
  if (mode === 'mysql') {
    await mysqlPool.query('DELETE FROM RECIPE_COMMENT WHERE recipe_id = ?', [recipeId]);
    return;
  }

  const comments = await readComments();
  const remaining = comments.filter(
    (item) => Number(item.recipe_id) !== Number(recipeId)
  );
  if (remaining.length !== comments.length) await writeComments(remaining);
}

module.exports = {
  listByRecipe,
  findById,
  createComment,
  updateComment,
  deleteComment,
  removeAllForRecipe,
};
