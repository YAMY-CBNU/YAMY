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

   If the database already exists, apply `db/migrations/20260610_add_recipe_status.sql`
   and the newer migration files before starting the updated server.

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
- `GET /api/recipes/:recipeId/ratings`
- `GET /api/recipes/:recipeId/ratings/me`
  - header: `Authorization: Bearer <token>`
- `PUT /api/recipes/:recipeId/ratings/me`
  - header: `Authorization: Bearer <token>`
  - body: `{ "rating": 5 }`
- `GET /api/recipes/:recipeId/comments`
- `POST /api/recipes/:recipeId/comments`
  - header: `Authorization: Bearer <token>`
  - body: `{ "content": "맛있어요!" }`
- `PATCH /api/recipes/:recipeId/comments/:commentId`
  - header: `Authorization: Bearer <token>`
  - body: `{ "content": "수정한 댓글" }`
- `DELETE /api/recipes/:recipeId/comments/:commentId`
  - header: `Authorization: Bearer <token>`

## CSV Recipe Import

The importer reads only `recipe.csv`, `ingredient.csv`, and `step.csv`.
`failed.csv` is not read. By default, the CSV files are expected in the
workspace root, one level above the `main` repository.

Validate the CSV files without saving:

```bash
npm run import:recipes:dry-run
```

Import or update recipes:

```bash
npm run import:recipes
```

Use a different CSV directory:

```bash
node scripts/import-recipes-from-csv.js --csv-dir C:\path\to\csv
```

The command uses MySQL when the configured database is available and otherwise
stores recipes in `backend/data/recipes.json`. Re-running the command updates
existing external recipes by `external_recipe_id` instead of creating duplicates.

## Administrator Account

Create or reset an administrator account:

```bash
npm run create:admin -- --username "YAMY관리자" --email "admin@example.com" --password "strong-password"
```

The password must be at least 12 characters. The command adds the `USER.role`
column when needed and saves the account with the `admin` role. Administrators
can edit or delete every recipe and every comment from the recipe detail page.
