# HW#3 - YAMY Team

레시피 검색 서비스 **YAMY**의 랜딩 페이지입니다.  
키워드로 레시피를 검색하면 DB에서 데이터를 조회해 카드 형태로 보여줍니다.

---

## 프로젝트 구조

```
HW-3/
├── DB/
│   ├── recipe.csv          # 레시피 원본 데이터 (788개)
│   ├── schema.sql          # DB 및 테이블 생성 스크립트
│   └── import_csv.sql      # CSV 임포트 SQL (참고용)
├── backend/
│   ├── server.js           # Express API 서버
│   ├── .env                # DB 연결 환경변수
│   └── package.json
└── src/
    ├── App.jsx             # 라우팅 (/ 랜딩, /search 검색)
    ├── main.jsx
    ├── components/
    │   ├── Navbar.jsx      # 검색창 (키워드 입력 → /search 이동)
    │   ├── RecipeCard.jsx  # 레시피 카드 컴포넌트
    │   ├── HeroSection.jsx
    │   ├── FeaturesSection.jsx
    │   ├── TeamSection.jsx
    │   ├── CTASection.jsx
    │   └── Footer.jsx
    └── pages/
        └── SearchPage.jsx  # 검색 결과 페이지 (4×5 그리드 + 페이지네이션)
```

---

## 실행 방법

### 1. DB 세팅 (MySQL Workbench)

1. MySQL Workbench 실행 → 로컬 인스턴스 연결
2. `File > Open SQL Script` → `DB/schema.sql` 열기 → ⚡ Execute All
3. 왼쪽 Schemas에서 `yamy` DB 생성 확인
4. `yamy > Tables > RECIPE` 우클릭 → `Table Data Import Wizard`
5. `DB/recipe.csv` 선택 → Next → Next → Import (771개 임포트)

### 2. 백엔드 실행

```bash
cd backend
```

`.env` 파일에서 MySQL 비밀번호 수정:
```
DB_PASSWORD=본인_MySQL_비밀번호
```

```bash
node server.js
# → http://localhost:4000 실행
```

### 3. 프론트엔드 실행

```bash
# HW-3 루트 폴더에서
npm install
npm run dev
# → http://localhost:5173 실행
```

---

## 주요 기능

### 랜딩 페이지 (`/`)
- 서비스 소개 (Hero, Features, Team, CTA 섹션)
- 네비바 검색창에 키워드 입력 후 Enter → 검색 결과 페이지로 이동

### 검색 페이지 (`/search?q=키워드`)
- MySQL RECIPE 테이블에서 제목·설명 기준 키워드 검색
- 결과를 4열 × 5행 (20개) 카드 그리드로 표시
- 하단 페이지네이션으로 전체 결과 탐색
- 카드: 음식 이미지 / 제목 / 조리시간 / 난이도 / 북마크 버튼



## 팀원

| 이름 | 역할 |
| :--- | :--- |
| 최현준 | 팀리더 |
| 최나현 | 프론트엔드 |
| Nandin-Erdene | 프론트엔드 |
| 한정우 | 백엔드 |
