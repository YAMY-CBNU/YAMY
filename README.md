# YAMY

YAMY는 레시피 탐색, 상세 레시피, 로그인/회원가입, 내 레시피, 저장 목록, 프로필, 레시피 작성 화면을 담은 정적 프론트엔드 프로젝트입니다.

현재 화면 코드는 `frontend/` 폴더를 기준으로 관리합니다. 이전 루트 페이지에서 분리해 쓰던 `assets/` 폴더는 더 이상 현재 프론트엔드 구조와 맞지 않아 제거 대상입니다.

## 구조

```text
YAMY/
├─ frontend/
│  ├─ index.html
│  ├─ landing.html
│  ├─ login.html
│  ├─ signup.html
│  ├─ ramen.html
│  ├─ recipe-editor.html
│  ├─ my-recipe.html
│  ├─ my-picks.html
│  └─ profile.html
├─ backend/
├─ db/
│  └─ yamy.sql
└─ README.md
```

## 페이지

- `frontend/index.html`: 메인 탐색 페이지
- `frontend/landing.html`: 랜딩 페이지
- `frontend/login.html`: 로그인 페이지
- `frontend/signup.html`: 회원가입 페이지
- `frontend/ramen.html`: 라면 레시피 상세 페이지
- `frontend/recipe-editor.html`: 레시피 작성 페이지
- `frontend/my-recipe.html`: 내 레시피 페이지
- `frontend/my-picks.html`: 저장한 레시피 페이지
- `frontend/profile.html`: 프로필 페이지

## 실행

별도 빌드 도구 없이 브라우저에서 `frontend/index.html`을 열어 확인할 수 있습니다.

## 정리 메모

- 현재 페이지들은 Tailwind CDN과 각 HTML 내부 스타일을 중심으로 구성되어 있습니다.
- 기존 `assets/css/*`, `assets/js/*` 기반 구조는 이전 루트 HTML용 코드였기 때문에 제거했습니다.
- 앞으로 공통 스타일이나 스크립트를 다시 분리한다면 `frontend/` 기준으로 새 구조를 잡는 편이 좋습니다.
