const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yamy-dev-secret';

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
}

function requireAuth(req) {
  const token = extractToken(req);

  if (!token) {
    const error = new Error('인증 토큰이 필요합니다.');
    error.status = 401;
    throw error;
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    const error = new Error('유효하지 않은 토큰입니다.');
    error.status = 401;
    throw error;
  }
}

module.exports = {
  extractToken,
  requireAuth,
};
