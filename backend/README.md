# YAMY Backend

## Quick Start

MySQL Workbench에서 MySQL 서버를 켜고 `db/yamy.sql`을 실행해 `yamy` 데이터베이스와 테이블을 먼저 생성합니다.

그 다음 `backend/.env`의 MySQL 접속 정보를 본인 환경에 맞게 수정합니다.

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=yamy
JWT_SECRET=change_this_secret
CORS_ORIGIN=*
```

백엔드 서버 실행 명령어는 아래와 같습니다.

```bash
cd backend
npm install
npm run dev
```

정상 실행되면 아래 주소에서 서버 상태를 확인할 수 있습니다.

```text
http://localhost:3000/health
```

응답이 아래처럼 나오면 서버와 기본 라우팅이 정상 작동하는 상태입니다.

```json
{ "ok": true }
```

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
