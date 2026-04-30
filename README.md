# YAMY 🍳

YAMY는 레시피 탐색, 상세 레시피, 로그인/회원가입, 내 레시피, 저장 목록, 프로필, 레시피 작성 화면을 담은 프로젝트입니다.

---
## 🎨 UI/UX 와이어프레임

👉 https://stitch.withgoogle.com/projects/9786636202094233003

- 전체 서비스 흐름과 화면 설계를 확인할 수 있습니다.
- 프론트엔드 개발 전 UI 구조 참고용으로 제작되었습니다.

---
## 📂 프로젝트 구조

```text
YAMY/
├─ frontend/      # 프론트엔드 UI 관련 (HTML, CSS, JS)
│  ├─ index.html
│  ├─ landing.html
│  ├─ login.html
│  ├─ signup.html
│  ├─ ramen.html
│  ├─ recipe-editor.html
│  ├─ my-recipe.html
│  ├─ my-picks.html
│  └─ profile.html
├─ backend/       # 백엔드 API 및 서버 로직
├─ db/            # 데이터베이스 설계 및 SQL 스크립트
│  └─ yamy.sql
└─ README.md
```
---

## 📄 주요 페이지 설명

- **frontend/index.html**: 메인 탐색 페이지
- **frontend/landing.html**: 서비스 소개 랜딩 페이지
- **frontend/login.html**: 로그인 페이지
- **frontend/signup.html**: 회원가입 페이지
- **frontend/ramen.html**: 라면 레시피 상세 페이지
- **frontend/recipe-editor.html**: 레시피 작성 페이지
- **frontend/my-recipe.html**: 내 레시피 목록 페이지
- **frontend/my-picks.html**: 내가 저장한 레시피 페이지
- **frontend/profile.html**: 프로필 관리 페이지

---

## 🚀 실행 방법

별도의 빌드 도구 없이 브라우저에서 `frontend/index.html`을 열어 즉시 확인할 수 있습니다.

---

## 🤝 협업 가이드 (Collaboration Guide)

우리 프로젝트는 파트별로 브랜치를 나누어 작업한 뒤, 검토를 거쳐 `main`에 합치는 방식으로 진행합니다.

### 1. 역할 및 작업 영역
| 파트 | 담당 폴더 | 브랜치 접두어 |
| :--- | :--- | :--- |
| **Frontend** | frontend/ | feat/fe- |
| **Backend** | backend/ | feat/be- |
| **Database** | db/ | feat/db- |

### 2. 작업 순서 (Git Workflow)

1. **최신 코드 동기화**
   - 작업 시작 전 main 브랜치의 최신 상태를 가져옵니다.
   - 명령어: `git checkout main` -> `git pull origin main`

2. **브랜치 생성**
   - 본인의 작업 내용에 맞는 새 브랜치를 만듭니다.
   - 예: `git checkout -b feat/fe-login-ui`

3. **작업 및 커밋**
   - 담당 폴더에서 작업 후 커밋을 남깁니다.
   - 예: `git add .` -> `git commit -m "feat: 로그인 UI 구현"`

4. **푸시 및 Pull Request(PR) 생성**
   - 작업한 브랜치를 원격 저장소에 올립니다.
   - 명령어: `git push origin feat/fe-login-ui`
   - GitHub 리포지토리에서 **Pull Request**를 생성하고 팀원에게 알립니다.

5. **병합(Merge)**
   - 팀원의 확인을 받은 후 main 브랜치에 병합합니다.

### ⚠️ 주의사항
- **직접 Push 금지**: main 브랜치에 직접 푸시하지 않습니다. 반드시 PR을 거쳐야 합니다.
- **영역 준수**: 가급적 본인이 담당한 폴더 내의 파일만 수정하여 충돌(Conflict)을 방지합니다.
- **커밋 메시지**: feat:, fix:, docs:, style: 등 접두사를 활용해 주세요.

---

## 📝 정리 메모

- 현재 페이지들은 Tailwind CDN과 각 HTML 내부 스타일을 중심으로 구성되어 있습니다.
- 공통 스타일이나 스크립트를 분리할 경우 frontend/ 하위 폴더 구조를 새로 정의할 예정입니다.
