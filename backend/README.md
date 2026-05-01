# YAMY Backend

## Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env` from `.env.example`

```bash
copy .env.example .env
```

3. Fill in MySQL credentials and JWT secret in `.env`

4. Start MySQL and apply `db/yamy.sql`

5. Run the server

```bash
npm run dev
```

## API

- `POST /api/auth/signup`
  - body: `{ "name": "닉네임", "email": "user@example.com", "password": "password123" }`
- `POST /api/auth/login`
  - body: `{ "email": "user@example.com", "password": "password123" }`
- `GET /api/auth/me`
  - header: `Authorization: Bearer <token>`
