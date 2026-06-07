require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql2/promise');

const app  = express();
const PORT = process.env.PORT || 4000;

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

app.listen(PORT, () => {
  console.log(`YAMY 백엔드 서버 실행 중: http://localhost:${PORT}`);
});
