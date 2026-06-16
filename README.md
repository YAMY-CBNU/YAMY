# YAMY

YAMY는 레시피를 찾고, 저장하고, 직접 작성할 수 있는 웹 프로젝트입니다. 프론트엔드는 정적 HTML/CSS/JS로 구성되어 있고, 백엔드는 Express와 MySQL을 사용합니다.

## 프로젝트 구조

```text
YAMY/main/
├─ frontend/        # 화면 HTML, CSS, 브라우저 JS
├─ backend/         # Express API 서버
├─ db/              # DB 초기 스키마와 migration
├─ LOCAL_SETUP.md   # 로컬 실행 절차
└─ README.md
```

## 주요 화면

- `frontend/index.html`: 메인 화면
- `frontend/search-results.html`: 검색 결과
- `frontend/recipe-detail.html`: 레시피 상세
- `frontend/recipe-editor.html`: 레시피 작성/수정
- `frontend/my-recipe.html`: 내 레시피
- `frontend/my-picks.html`: 저장한 레시피
- `frontend/login.html`, `frontend/signup.html`: 로그인/회원가입
- `frontend/profile.html`: 프로필

## 실행

전체 기능을 확인하려면 MySQL, 백엔드 서버, 프론트엔드 정적 서버가 필요합니다. 처음 실행하는 경우에는 [LOCAL_SETUP.md](./LOCAL_SETUP.md)를 따라 진행하면 됩니다.

백엔드만 빠르게 실행하려면:

```powershell
cd backend
npm install
npm run dev
```

서버 상태 확인:

```text
http://localhost:3000/health
```

## 협업 방식

- 작업 전 `main`을 최신 상태로 맞춥니다.
- 기능별 브랜치에서 작업한 뒤 PR로 합칩니다.
- 브랜치 이름은 담당 영역을 알아볼 수 있게 작성합니다.

```text
feat/fe-...
feat/be-...
feat/db-...
```

`main`에는 직접 push하지 않습니다.
