const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysqlPool = require('../config/db');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');
const BCRYPT_ROUNDS = 10;

let modePromise;

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readUsers() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeUsers(users) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function detectMode() {
  try {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.query('SELECT 1 FROM `USER` LIMIT 1');
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

function toUserRow(user) {
  return {
    user_id: user.user_id,
    username: user.username,
    email: user.email,
    password_hash: user.password_hash,
    profile_image_url: user.profile_image_url || null,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

async function findByEmailOrUsername(email, username) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const [rows] = await mysqlPool.query(
      'SELECT user_id, username, email, password_hash, profile_image_url, created_at, updated_at FROM `USER` WHERE email = ? OR username = ? LIMIT 1',
      [email, username]
    );
    return rows[0] || null;
  }

  const users = await readUsers();
  return users.find((user) => user.email === email || user.username === username) || null;
}

async function findByEmail(email) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const [rows] = await mysqlPool.query(
      'SELECT user_id, username, email, password_hash, profile_image_url, created_at, updated_at FROM `USER` WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] || null;
  }

  const users = await readUsers();
  return users.find((user) => user.email === email) || null;
}

async function findByUsername(username) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const [rows] = await mysqlPool.query(
      'SELECT user_id, username, email, password_hash, profile_image_url, created_at, updated_at FROM `USER` WHERE username = ? LIMIT 1',
      [username]
    );
    return rows[0] || null;
  }

  const users = await readUsers();
  return users.find((user) => user.username === username) || null;
}

async function findById(userId) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const [rows] = await mysqlPool.query(
      'SELECT user_id, username, email, password_hash, profile_image_url, created_at, updated_at FROM `USER` WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  }

  const users = await readUsers();
  return users.find((user) => Number(user.user_id) === Number(userId)) || null;
}

async function updateUser(userId, { username, passwordHash }) {
  const mode = await getMode();

  if (mode === 'mysql') {
    if (passwordHash) {
      await mysqlPool.query(
        'UPDATE `USER` SET username = ?, password_hash = ? WHERE user_id = ?',
        [username, passwordHash, userId]
      );
    } else {
      await mysqlPool.query(
        'UPDATE `USER` SET username = ? WHERE user_id = ?',
        [username, userId]
      );
    }

    return findById(userId);
  }

  const users = await readUsers();
  const userIndex = users.findIndex((user) => Number(user.user_id) === Number(userId));

  if (userIndex === -1) {
    return null;
  }

  users[userIndex] = {
    ...users[userIndex],
    username,
    password_hash: passwordHash || users[userIndex].password_hash,
    updated_at: new Date().toISOString(),
  };

  await writeUsers(users);
  return users[userIndex];
}

async function createUser({ username, email, passwordHash }) {
  const mode = await getMode();

  if (mode === 'mysql') {
    const [result] = await mysqlPool.query(
      'INSERT INTO `USER` (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const [rows] = await mysqlPool.query(
      'SELECT user_id, username, email, password_hash, profile_image_url, created_at, updated_at FROM `USER` WHERE user_id = ? LIMIT 1',
      [result.insertId]
    );

    return rows[0];
  }

  const users = await readUsers();
  const nextId = users.reduce((maxId, user) => Math.max(maxId, Number(user.user_id) || 0), 0) + 1;
  const now = new Date().toISOString();
  const newUser = toUserRow({
    user_id: nextId,
    username,
    email,
    password_hash: passwordHash,
    profile_image_url: null,
    created_at: now,
    updated_at: now,
  });
  users.push(newUser);
  await writeUsers(users);
  return newUser;
}

async function createPasswordHash(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function addPick(userId, recipeId) {
  const mode = await getMode();
  if (mode === 'mysql') return;

  const users = await readUsers();
  const idx = users.findIndex((u) => Number(u.user_id) === Number(userId));
  if (idx === -1) return;

  const picks = users[idx].picks || [];
  const id = Number(recipeId);
  if (!picks.includes(id)) {
    users[idx].picks = [...picks, id];
    users[idx].updated_at = new Date().toISOString();
    await writeUsers(users);
  }
}

async function removePick(userId, recipeId) {
  const mode = await getMode();
  if (mode === 'mysql') return;

  const users = await readUsers();
  const idx = users.findIndex((u) => Number(u.user_id) === Number(userId));
  if (idx === -1) return;

  users[idx].picks = (users[idx].picks || []).filter((id) => id !== Number(recipeId));
  users[idx].updated_at = new Date().toISOString();
  await writeUsers(users);
}

async function getPicks(userId) {
  const mode = await getMode();
  if (mode === 'mysql') return [];

  const users = await readUsers();
  const user = users.find((u) => Number(u.user_id) === Number(userId));
  return user?.picks || [];
}

module.exports = {
  getMode,
  findByEmailOrUsername,
  findByEmail,
  findByUsername,
  findById,
  createUser,
  updateUser,
  createPasswordHash,
  addPick,
  removePick,
  getPicks,
};
