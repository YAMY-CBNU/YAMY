# YAMY Backend

Express 기반 API 서버입니다. 인증, 레시피, 저장 목록, 별점, 댓글 기능을 처리합니다.

## 실행

```bash
npm install
npm run dev
```

기본 주소:

```text
http://localhost:3000
```

상태 확인:

```text
http://localhost:3000/health
```

```json
{ "ok": true }
```

## 환경 변수

`.env.example`을 복사해 `.env`를 만들고 MySQL 정보를 입력합니다.

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=yamy
JWT_SECRET=change_this_secret
CORS_ORIGIN=*
```

처음 실행하는 DB는 `db/yamy.sql`을 적용합니다. 기존 DB에 이어 붙이는 경우에는 `db/migrations` 파일을 날짜순으로 실행합니다. 전체 로컬 실행 순서는 루트의 `LOCAL_SETUP.md`를 참고합니다.

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

## CSV 가져오기

가져오기 대상은 `recipe.csv`, `ingredient.csv`, `step.csv`입니다. 기본 위치는 `main` 폴더의 한 단계 위입니다.

검증만 실행:

```bash
npm run import:recipes:dry-run
```

DB에 저장 또는 갱신:

```bash
npm run import:recipes
```

다른 폴더를 사용할 때:

```bash
node scripts/import-recipes-from-csv.js --csv-dir C:\path\to\csv
```

MySQL 연결이 가능하면 MySQL에 저장하고, 연결할 수 없으면 `backend/data/recipes.json`에 저장합니다. 같은 `external_recipe_id`를 다시 가져오면 새로 추가하지 않고 갱신합니다.

## 관리자 계정

```bash
npm run create:admin -- --username "YAMY관리자" --email "admin@example.com" --password "strong-password"
```

비밀번호는 12자 이상이어야 합니다. 관리자 계정은 모든 레시피와 댓글을 수정하거나 삭제할 수 있습니다.
