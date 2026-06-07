require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const app  = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'yamy-dev-secret';

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

function normalize(value) {
  return String(value ?? '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toSafeUser(user) {
  return {
    id: user.user_id,
    username: user.username,
    email: user.email,
    profileImageUrl: user.profile_image_url,
  };
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

app.post('/api/auth/signup', async (req, res) => {
  const username = normalize(req.body.name ?? req.body.username);
  const email = normalize(req.body.email).toLowerCase();
  const password = String(req.body.password ?? '');

  if (!username) {
    return res.status(400).json({ message: '닉네임을 입력해 주세요.' });
  }
  if (username.length > 50) {
    return res.status(400).json({ message: '닉네임은 50자 이내로 입력해 주세요.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: '올바른 이메일 형식을 입력해 주세요.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
  }

  try {
    const [existingUsers] = await pool.query(
      'SELECT user_id FROM `USER` WHERE email = ? OR username = ? LIMIT 1',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: '이미 사용 중인 이메일 또는 닉네임입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO `USER` (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    const [users] = await pool.query(
      'SELECT user_id, username, email, profile_image_url FROM `USER` WHERE user_id = ?',
      [result.insertId]
    );
    const user = users[0];

    return res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      token: createToken(user),
      user: toSafeUser(user),
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 사용 중인 이메일 또는 닉네임입니다.' });
    }

    console.error('Signup error:', err);
    return res.status(500).json({ message: '회원가입 처리 중 오류가 발생했습니다.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = normalize(req.body.email).toLowerCase();
  const password = String(req.body.password ?? '');

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 확인해 주세요.' });
  }

  try {
    const [users] = await pool.query(
      `SELECT user_id, username, email, password_hash, profile_image_url
       FROM \`USER\`
       WHERE email = ?
       LIMIT 1`,
      [email]
    );
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    return res.json({
      message: '로그인되었습니다.',
      token: createToken(user),
      user: toSafeUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// GET /api/recipes/search?q=키워드&page=1&limit=20
app.get('/api/recipes/search', async (req, res) => {
  const q     = req.query.q     || '';
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  try {
    const keyword = `%${q}%`;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM RECIPE
       WHERE title LIKE ? OR description LIKE ?`,
      [keyword, keyword]
    );

    const [rows] = await pool.query(
      `SELECT recipe_id AS id, title, thumbnail_url, difficulty, cook_time, serving_size
       FROM RECIPE
       WHERE title LIKE ? OR description LIKE ?
       ORDER BY recipe_id
       LIMIT ? OFFSET ?`,
      [keyword, keyword, limit, offset]
    );

    res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      recipes: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/recipes?page=1&limit=20  (전체 목록)
app.get('/api/recipes', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM RECIPE');

    const [rows] = await pool.query(
      `SELECT recipe_id AS id, title, thumbnail_url, difficulty, cook_time, serving_size
       FROM RECIPE ORDER BY recipe_id LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({ total, page, totalPages: Math.ceil(total / limit), recipes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: '요청한 API를 찾을 수 없습니다.' });
});

app.listen(PORT, () => {
  console.log(`YAMY 백엔드 서버 실행 중: http://localhost:${PORT}`);
});
