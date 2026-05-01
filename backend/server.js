require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3000;
const corsOrigin = process.env.CORS_ORIGIN || '*';
const corsOptions = process.env.CORS_ORIGIN
  ? { origin: corsOrigin === '*' ? true : corsOrigin, credentials: true }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
});

app.listen(port, () => {
  console.log(`YAMY auth server running on http://localhost:${port}`);
});
