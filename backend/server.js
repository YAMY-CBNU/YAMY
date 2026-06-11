require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');

const app = express();
const port = Number(process.env.PORT) || 3000;
const corsOrigin = process.env.CORS_ORIGIN || '*';
const corsOptions = process.env.CORS_ORIGIN
  ? { origin: corsOrigin === '*' ? true : corsOrigin, credentials: true }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.use(express.json({ limit: '25mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
});

const server = app.listen(port, () => {
  console.log(`YAMY auth server running on http://localhost:${port}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    const fallbackPort = port + 1;
    console.warn(`Port ${port} in use, trying ${fallbackPort}`);
    // try listening on the next port
    app.listen(fallbackPort, () => {
      console.log(`YAMY auth server running on http://localhost:${fallbackPort}`);
    }).on('error', (e) => {
      console.error('Failed to bind to fallback port:', e);
      process.exit(1);
    });
  } else {
    console.error(err);
    process.exit(1);
  }
});
