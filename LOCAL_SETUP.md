# YAMY 로컬 실행

새 컴퓨터에서 `main` 코드를 받은 뒤 데모 환경을 준비하는 절차입니다. CSV 파일은 저장소 폴더 안이 아니라 `main` 폴더 옆에 둡니다.

```text
YAMY/
├─ main/
│  ├─ backend/
│  ├─ frontend/
│  └─ db/
├─ recipe.csv
├─ ingredient.csv
└─ step.csv
```

`failed.csv`가 있어도 가져오기 스크립트는 읽지 않습니다.

## 1. 코드 받기

```powershell
git switch main
git pull origin main
```

## 2. 백엔드 패키지 설치

```powershell
cd backend
npm.cmd install
```

## 3. 환경 변수 설정

`backend/.env.example`을 복사해 `.env`를 만듭니다.

```powershell
Copy-Item .env.example .env -Force
```

MySQL 정보에 맞게 값을 수정합니다.

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=본인의_MySQL_비밀번호
DB_NAME=yamy
JWT_SECRET=원하는_긴_문자열
CORS_ORIGIN=*
```

## 4. DB 준비

처음 만드는 DB라면 `db/yamy.sql`을 실행합니다.

기존 `yamy` DB를 유지하는 경우에는 migration을 날짜순으로 실행합니다.

```text
1. db/migrations/20260610_add_recipe_status.sql
2. db/migrations/20260613_add_recipe_feedback.sql
3. db/migrations/20260613_add_recipe_tips.sql
4. db/migrations/20260614_add_user_role.sql
```

다른 DB 이름을 쓴다면 각 SQL 파일의 `USE yamy;`를 실제 DB 이름으로 바꿉니다.

## 5. CSV 확인

`recipe.csv`, `ingredient.csv`, `step.csv`를 `main` 폴더 옆에 둔 뒤 `backend` 폴더에서 검증합니다.

```powershell
npm.cmd run import:recipes:dry-run
```

성공하면 다음 문구가 나옵니다.

```text
CSV validation completed.
Dry run only; no recipes were saved.
```

## 6. CSV 가져오기

```powershell
npm.cmd run import:recipes
```

MySQL에 저장되면 결과에 `Import completed in mysql mode`가 포함됩니다. `file mode`라고 나오면 MySQL 대신 `backend/data/recipes.json`에 저장된 상태입니다. 이 경우 `.env`, MySQL 서버 실행 상태, DB 이름을 확인한 뒤 다시 실행합니다.

CSV가 다른 위치에 있다면 직접 지정할 수 있습니다.

```powershell
npm.cmd run import:recipes -- --csv-dir "C:\CSV파일이있는폴더"
```

## 7. 서버 실행

```powershell
npm run dev
```

브라우저에서 상태를 확인합니다.

```text
http://localhost:3000/health
```

정상 응답:

```json
{ "ok": true }
```

## 8. 프론트엔드 실행

VS Code에서 `frontend/index.html`을 Live Server로 실행합니다. HTML 파일을 직접 열어도 일부 화면은 보이지만, 경로와 브라우저 보안 문제를 줄이려면 Live Server를 쓰는 편이 낫습니다.

## 관리자 계정

관리자 기능을 확인하려면 `backend` 폴더에서 계정을 만듭니다.

```powershell
npm.cmd run create:admin -- --username "YAMY관리자" --email "admin@example.com" --password "12자이상의비밀번호"
```
