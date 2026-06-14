# YAMY 데모용 로컬 실행 방법

다른 팀원이 `main` 코드를 받은 뒤, 기존 `nahyun_FE`의 `yamy` DB에 migration을 아직 적용하지 않았다는 기준으로 설명합니다.

최종 폴더 배치는 다음과 같아야 합니다.

```text
YAMY/
├─ main/
│  ├─ backend/
│  ├─ frontend/
│  └─ db/
├─ recipe.csv
├─ ingredient.csv
├─ step.csv
└─ failed.csv        # 있어도 사용하지 않음
```

`recipe.csv`, `ingredient.csv`, `step.csv`는 `main` 폴더 안이 아니라 **main 폴더 옆**, 즉 `YAMY` 폴더 바로 아래에 둡니다.

## 1. main 코드 받기

저장소의 `main` 폴더에서 실행합니다.

```powershell
git switch main
git pull origin main
```

## 2. 백엔드 패키지 설치

터미널 위치를 `main/backend`로 이동합니다.

```powershell
cd backend
npm.cmd install
```

## 3. backend/.env 설정(일단 안하고 진행해보기)

`main/backend/.env.example`을 복사해 `.env`를 만듭니다.

```powershell
Copy-Item .env.example .env -Force
```

`main/backend/.env`를 본인 MySQL 환경에 맞게 수정합니다.

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=본인의_MySQL_비밀번호
DB_NAME=yamy
JWT_SECRET=원하는_긴_문자열
CORS_ORIGIN=*
```

MySQL 서버가 실행 중이어야 합니다.

## 4. migration 네 개 실행

MySQL Workbench에서 다음 파일을 **아래 순서대로 한 파일씩 전체 실행**합니다.

```text
1. main/db/migrations/20260610_add_recipe_status.sql
2. main/db/migrations/20260613_add_recipe_feedback.sql
3. main/db/migrations/20260613_add_recipe_tips.sql
4. main/db/migrations/20260614_add_user_role.sql
```

각 파일은 기본적으로 `yamy` DB를 사용합니다.

```sql
USE yamy;
```

다른 DB 이름을 사용한다면 각 migration 파일의 `USE yamy;`를 실제 DB 이름으로 바꿔야 합니다.

현재 migration은 이미 존재하는 주요 컬럼과 테이블을 확인하도록 되어 있어, 일부 변경이 적용된 DB에서도 순서대로 실행할 수 있습니다.

## 5. CSV 파일 준비

다음 세 파일을 `main` 폴더 옆에 둡니다.

```text
recipe.csv
ingredient.csv
step.csv
```

예시:

```text
C:\Users\사용자이름\Desktop\YAMY\recipe.csv
C:\Users\사용자이름\Desktop\YAMY\ingredient.csv
C:\Users\사용자이름\Desktop\YAMY\step.csv
C:\Users\사용자이름\Desktop\YAMY\main\
```

`failed.csv`는 같은 위치에 있어도 가져오기 코드가 읽지 않습니다.

## 6. CSV 검증

터미널 위치가 `main/backend`인지 확인합니다.

```powershell
cd C:\Users\사용자이름\Desktop\YAMY\main\backend
```

먼저 DB에 저장하지 않고 CSV 형식만 검사합니다.

```powershell
npm.cmd run import:recipes:dry-run
```

성공하면 다음과 비슷한 문구가 나옵니다.

```text
CSV validation completed.
Dry run only; no recipes were saved.
```

오류가 나오면 실제 저장 명령을 실행하지 말고 CSV 파일명, 위치, 헤더를 먼저 확인합니다.

## 7. CSV 레시피를 DB에 저장

같은 `main/backend` 터미널에서 실행합니다.

```powershell
npm.cmd run import:recipes
```

정상적으로 MySQL에 연결되면 결과에 다음 문구가 포함됩니다.

```text
Import completed in mysql mode
```

주의:

- `file mode`라고 나오면 MySQL이 아니라 `backend/data/recipes.json`에 저장된 것입니다.
- 이 경우 `.env`, MySQL 비밀번호, MySQL 서버 실행 상태, `yamy` DB 존재 여부를 확인한 뒤 다시 실행합니다.
- 같은 CSV를 다시 실행해도 `external_recipe_id`가 같은 레시피는 중복 추가되지 않고 갱신됩니다.

CSV 파일을 다른 위치에 두었다면 다음처럼 직접 경로를 지정할 수 있습니다.

```powershell
npm.cmd run import:recipes -- --csv-dir "C:\CSV파일이있는폴더"
```

## 8. 백엔드 실행

CSV import가 끝난 뒤 `main/backend`에서 실행합니다.

```powershell
npm run dev
```

브라우저에서 다음 주소를 열어 확인합니다.

```text
http://localhost:3000/health
```

아래 결과가 나오면 백엔드가 정상입니다.

```json
{ "ok": true }
```

## 9. 프론트엔드 실행

VS Code에서 `main/frontend/index.html`을 Live Server로 실행합니다.

현재처럼 HTML 파일을 직접 열어도 동작할 수 있지만, 브라우저 보안이나 경로 문제를 줄이려면 Live Server 사용을 권장합니다.

## 전체 순서 요약

```text
1. main 최신 코드 받기
2. main/backend에서 npm install
3. backend/.env에 본인 MySQL 정보 입력
4. migration 네 개를 날짜순으로 실행
5. recipe.csv, ingredient.csv, step.csv를 main 폴더 옆에 배치
6. main/backend에서 npm run import:recipes:dry-run
7. main/backend에서 npm run import:recipes
8. main/backend에서 npm run dev
9. frontend/index.html 실행
```

여기까지 하면 다른 컴퓨터에서도 CSV 레시피가 등록된 상태로 메인 화면, 검색, 상세 페이지, 저장, 별점, 댓글 등 대부분의 데모를 진행할 수 있습니다.

회원 기능까지 시연하려면 새 계정을 회원가입하면 됩니다. 관리자 기능도 필요하다면 `main/backend`에서 다음 명령을 추가로 실행합니다.

```powershell
npm.cmd run create:admin -- --username "YAMY관리자" --email "admin@example.com" --password "12자이상의비밀번호"
```
