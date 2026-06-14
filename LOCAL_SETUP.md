# YAMY 로컬 실행 매뉴얼

이 문서는 다른 팀원이 `main` 브랜치를 받은 뒤 자신의 로컬 환경에서 YAMY를 실행하는 순서를 설명합니다.

중요한 점은 Git으로 전달되는 것은 코드와 DB 스키마뿐이라는 것입니다. 다른 사람의 MySQL 데이터와 CSV에서 가져온 레시피는 `git pull`만으로 전달되지 않습니다.

## 1. 준비물

- Git
- Node.js 18 이상
- npm
- MySQL 8.x 및 MySQL Workbench
- 프론트엔드를 띄울 정적 웹 서버
  - VS Code Live Server 또는 Python의 `http.server` 사용 가능

## 2. 최신 main 브랜치 받기

기존 작업이 있다면 먼저 커밋하거나 별도로 보관한 뒤 실행합니다.

```powershell
git switch main
git pull origin main
```

처음 받는 저장소라면 clone 후 프로젝트 폴더로 이동합니다.

```powershell
git clone <repository-url>
cd <repository-folder>
```

이후 명령은 `backend`, `frontend`, `db` 폴더가 보이는 저장소 루트에서 시작한다고 가정합니다.

## 3. 백엔드 패키지 설치

```powershell
cd backend
npm.cmd ci
```

`package-lock.json`이 없거나 `npm.cmd ci`가 실패할 때만 다음 명령을 사용합니다.

```powershell
npm.cmd install
```

`node_modules`는 각자 설치해야 하며 다른 사람의 폴더를 복사하지 않습니다.

## 4. 로컬 환경변수 설정

`backend` 폴더에서 `.env.example`을 복사합니다.

```powershell
Copy-Item .env.example .env -Force
```

`backend/.env`를 자신의 MySQL 환경에 맞게 수정합니다.

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=본인의_MySQL_비밀번호
DB_NAME=yamy
JWT_SECRET=팀원이_각자_정한_충분히_긴_문자열
CORS_ORIGIN=*
```

- 로컬 개발에서는 `CORS_ORIGIN=*`을 사용하면 가장 간단합니다.
- `.env`의 비밀번호와 `JWT_SECRET`을 Git에 커밋하지 않습니다.
- 프론트엔드는 현재 `http://localhost:3000`의 API를 사용하므로 `PORT=3000`을 권장합니다.

## 5. 데이터베이스 준비 방법 선택

### 방법 A: 새 yamy DB 만들기 (권장)

기존 `nahyun_FE` DB와 분리된 새 DB를 만드는 가장 안전한 방법입니다.

1. MySQL 서버를 실행합니다.
2. MySQL Workbench에서 `db/yamy.sql`을 엽니다.
3. 파일 전체를 한 번 실행합니다.

`yamy.sql`에는 현재 필요한 모든 최신 테이블과 컬럼이 포함되어 있습니다. 새 DB를 만든 뒤에는 `db/migrations` 파일을 추가로 실행하지 않습니다.

### 방법 B: 기존 nahyun_FE DB를 계속 사용하기

기존 회원이나 레시피 데이터를 유지해야 할 때만 선택합니다.

1. 기존 DB를 먼저 백업합니다.
2. `backend/.env`의 `DB_NAME`을 실제 DB 이름으로 설정합니다.
3. 아래 항목이 있는지 확인합니다.

```sql
SHOW COLUMNS FROM RECIPE LIKE 'status';
SHOW COLUMNS FROM `USER` LIKE 'role';
SHOW TABLES LIKE 'RECIPE_TIP';
SHOW TABLES LIKE 'RECIPE_RATING';
SHOW TABLES LIKE 'RECIPE_COMMENT';
```

4. 누락된 항목에 해당하는 migration만 날짜순으로 적용합니다.

```text
db/migrations/20260610_add_recipe_status.sql
db/migrations/20260613_add_recipe_feedback.sql
db/migrations/20260613_add_recipe_tips.sql
db/migrations/20260614_add_user_role.sql
```

주의:

- migration 파일에는 `USE yamy;`가 들어 있습니다.
- 기존 DB 이름이 `yamy`가 아니라면 migration 사본의 `USE yamy;`를 실제 DB 이름으로 바꾼 뒤 실행해야 합니다.
- 이미 존재하는 컬럼이나 테이블의 migration을 다시 실행하면 오류가 날 수 있으므로 무조건 전체 실행하지 않습니다.
- 기존 스키마 차이가 크거나 보존할 데이터가 없다면 방법 A가 더 안전합니다.

## 6. MySQL 연결 모드 확인

`backend` 폴더에서 다음 명령을 실행합니다.

```powershell
node -e "require('dotenv').config(); const store=require('./storage/recipesStore'); const db=require('./config/db'); store.getMode().then(mode=>console.log('storage mode:', mode)).finally(()=>db.end())"
```

정상적으로 MySQL을 사용하면 다음과 같이 나옵니다.

```text
storage mode: mysql
```

`storage mode: file`이 나오면 MySQL 접속 정보, MySQL 실행 상태, DB 이름을 다시 확인합니다.

이 프로젝트는 MySQL 연결에 실패하면 `backend/data/*.json`을 사용하는 file 모드로 자동 전환합니다. 서버가 켜졌다는 사실만으로 MySQL 연결까지 성공한 것은 아닙니다. 연결 설정을 수정했다면 백엔드 서버를 재시작해야 합니다.

## 7. 레시피 데이터 준비

### CSV가 없는 경우

CSV 가져오기를 실행하지 않고 다음 단계로 넘어갑니다.

이 상태에서도 회원가입, 로그인, 레시피 작성, 수정, 삭제, 저장, 별점, 댓글, 검색 기능은 사용할 수 있습니다. 다만 DB에 레시피가 없으므로 처음 메인 화면과 검색 결과가 비어 있는 것이 정상입니다.

테스트 레시피는 로그인한 뒤 `레시피 작성` 화면에서 직접 등록할 수 있습니다.

### CSV가 있는 경우

다음 세 파일이 같은 폴더에 있어야 합니다.

```text
recipe.csv
ingredient.csv
step.csv
```

`failed.csv`는 읽지 않습니다. 카테고리 값이 없더라도 CSV 헤더는 존재해야 하며 값은 빈 문자열로 둘 수 있습니다.

먼저 저장하지 않는 검증을 실행합니다.

```powershell
npm.cmd run import:recipes:dry-run -- --csv-dir "C:\CSV가있는폴더"
```

검증이 성공한 뒤 실제 저장을 실행합니다.

```powershell
npm.cmd run import:recipes -- --csv-dir "C:\CSV가있는폴더"
```

- MySQL 연결이 정상이면 `yamy` DB에 저장됩니다.
- MySQL 연결이 실패한 상태라면 `backend/data/recipes.json`에 저장됩니다.
- 같은 `external_recipe_id`를 다시 가져오면 중복 추가하지 않고 기존 레시피를 갱신합니다.

### 다른 팀원과 동일한 CSV 레시피가 필요한 경우

Git은 로컬 MySQL 데이터를 공유하지 않습니다. 따라서 아래 중 하나가 필요합니다.

1. 동일한 CSV 세 파일을 전달받아 각자 import합니다.
2. 개인정보를 제거한 팀 공용 seed SQL을 만들어 각자 DB에 import합니다.

계정, 비밀번호 해시, 댓글 등이 포함된 개인 DB 전체 덤프를 그대로 공유하지 않습니다.

## 8. 관리자 계정 만들기 (선택)

모든 레시피와 댓글을 관리할 계정이 필요할 때 실행합니다.

```powershell
npm.cmd run create:admin -- --username "YAMY관리자" --email "admin@example.com" --password "12자이상의비밀번호"
```

명령 결과가 `mysql mode`인지 확인합니다. 같은 이메일로 다시 실행하면 관리자 이름과 비밀번호가 갱신됩니다.

## 9. 백엔드 실행

`backend` 폴더에서 실행합니다.

```powershell
npm.cmd run dev
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:3000/health
```

아래 응답이 나오면 HTTP 서버가 정상 실행된 것입니다.

```json
{ "ok": true }
```

## 10. 프론트엔드 실행

새 터미널을 열고 저장소 루트에서 실행합니다.

Python이 설치되어 있다면:

```powershell
py -m http.server 5500 --directory frontend
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:5500/index.html
```

Python이 없다면 VS Code Live Server로 `frontend/index.html`을 실행해도 됩니다. HTML 파일을 직접 여는 것보다 정적 웹 서버 사용을 권장합니다.

## 11. 최초 확인 순서

1. `/health`가 `{ "ok": true }`를 반환하는지 확인합니다.
2. 저장 모드 확인 명령이 `mysql`을 출력하는지 확인합니다.
3. 회원가입과 로그인이 되는지 확인합니다.
4. CSV가 없다면 레시피 하나를 작성하고 공개 저장합니다.
5. 메인 화면에 작성한 레시피가 표시되는지 확인합니다.
6. 제목 또는 재료명으로 검색되는지 확인합니다.
7. 상세 페이지에서 저장, 별점, 댓글 기능을 확인합니다.
8. 관리자 계정을 만들었다면 다른 사용자의 레시피와 댓글 수정·삭제 버튼을 확인합니다.

## 12. 자주 발생하는 문제

### 서버는 켜지지만 레시피가 보이지 않음

- 새 DB이고 CSV를 가져오지 않았다면 정상입니다.
- 기존 DB를 사용한다고 생각했는데 `.env`의 `DB_NAME`이 다른지 확인합니다.
- `storage mode: file`인지 확인합니다.

### file 모드에 만든 데이터가 MySQL에서 보이지 않음

JSON file 모드와 MySQL 모드의 데이터는 자동으로 동기화되지 않습니다. MySQL 설정을 고친 뒤에는 MySQL에 레시피를 다시 작성하거나 CSV를 다시 import해야 합니다.

### `ER_NO_SUCH_TABLE` 또는 `Unknown column` 오류

- 새 환경이면 `db/yamy.sql`을 실행했는지 확인합니다.
- 기존 DB면 5단계의 스키마 확인 후 누락된 migration만 적용합니다.

### 프론트에서 `Failed to fetch`가 표시됨

- 백엔드가 3000번 포트에서 실행 중인지 확인합니다.
- `http://localhost:3000/health`가 열리는지 확인합니다.
- `.env`의 `CORS_ORIGIN`을 로컬 개발용 `*`로 설정했는지 확인합니다.

### 3000번 포트가 이미 사용 중임

기존 3000번 포트 프로세스를 종료하는 방법을 권장합니다. 현재 프론트엔드 API 주소가 3000번으로 작성되어 있으므로 백엔드 포트만 변경하면 프론트엔드의 API 주소도 함께 수정해야 합니다.

## 권장 팀 운영 방식

- 코드와 DB 스키마는 Git으로 공유합니다.
- `.env`, MySQL 비밀번호, 실제 계정 데이터는 공유하지 않습니다.
- 공통 레시피 데이터가 필요하면 CSV 또는 개인정보가 제거된 seed SQL을 별도로 관리합니다.
- DB 변경은 `db/migrations`에 새 SQL 파일로 추가하고 적용 순서를 README에 기록합니다.
- 새 팀원은 가능하면 기존 개인 DB를 억지로 맞추기보다 별도의 `yamy` DB를 생성합니다.
