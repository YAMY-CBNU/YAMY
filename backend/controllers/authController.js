const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../storage/usersStore');

const JWT_SECRET = process.env.JWT_SECRET || 'yamy-dev-secret';

function normalize(value) {
  return String(value ?? '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

function safeUserRow(row) {
  return {
    id: row.user_id,
    username: row.username,
    email: row.email,
    profileImageUrl: row.profile_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

exports.signup = async (req, res) => {
  try {
    const username = normalize(req.body.name ?? req.body.username);
    const email = normalize(req.body.email);
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

    if (!isValidPassword(password)) {
      return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
    }

    const existingUser = await store.findByEmailOrUsername(email, username);
    if (existingUser) {
      return res.status(409).json({ message: '이미 사용 중인 이메일 또는 닉네임입니다.' });
    }

    const passwordHash = await store.createPasswordHash(password);
    const createdUser = await store.createUser({ username, email, passwordHash });
    const token = createToken(createdUser);

    return res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      token,
      user: safeUserRow(createdUser),
    });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 사용 중인 이메일 또는 닉네임입니다.' });
    }

    console.error('Signup error:', error);
    return res.status(500).json({ message: '회원가입 처리 중 오류가 발생했습니다.' });
  }
};

exports.login = async (req, res) => {
  try {
    const email = normalize(req.body.email);
    const password = String(req.body.password ?? '');

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: '올바른 이메일 형식을 입력해 주세요.' });
    }

    if (!password) {
      return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
    }

    const user = await store.findByEmail(email);

    if (!user) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: '로그인되었습니다.',
      token,
      user: safeUserRow(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: '로그인 처리 중 오류가 발생했습니다.' });
  }
};

exports.me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await store.findById(payload.userId);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    return res.status(200).json({ user: safeUserRow(user) });
  } catch (error) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const currentUser = await store.findById(payload.userId);

    if (!currentUser) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const username = normalize(req.body.username ?? req.body.name);
    const password = String(req.body.password ?? '');

    if (!username) {
      return res.status(400).json({ message: '닉네임을 입력해 주세요.' });
    }

    if (username.length > 50) {
      return res.status(400).json({ message: '닉네임은 50자 이내로 입력해 주세요.' });
    }

    if (password && !isValidPassword(password)) {
      return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
    }

    const existingUser = await store.findByUsername(username);
    if (existingUser && Number(existingUser.user_id) !== Number(currentUser.user_id)) {
      return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    const passwordHash = password ? await store.createPasswordHash(password) : null;
    const updatedUser = await store.updateUser(currentUser.user_id, { username, passwordHash });

    return res.status(200).json({
      message: '프로필 정보가 저장되었습니다.',
      user: safeUserRow(updatedUser),
    });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    console.error('Profile update error:', error);
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};
