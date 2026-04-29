CREATE DATABASE IF NOT EXISTS yamy DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yamy;

-- =====================
-- USER
-- =====================
CREATE TABLE USER (
    user_id           BIGINT       NOT NULL AUTO_INCREMENT,
    username          VARCHAR(50)  NOT NULL UNIQUE,
    email             VARCHAR(100) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    profile_image_url VARCHAR(500),
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
);

-- =====================
-- RECIPE
-- =====================
CREATE TABLE RECIPE (
    recipe_id          BIGINT        NOT NULL AUTO_INCREMENT,
    author_id          BIGINT,
    external_recipe_id VARCHAR(20),               -- 만개의 레시피 URL ID (예: 6961294)
    source_url         VARCHAR(500),              -- 원본 URL
    title              VARCHAR(200) NOT NULL,
    description        TEXT,                      -- 한줄 소개
    thumbnail_url      VARCHAR(500),
    difficulty         ENUM('아무나','초급','중급','고급','신의경지'),
    serving_size       VARCHAR(20),               -- "4인분" 문자열 그대로 저장
    cook_time          VARCHAR(30),               -- "30분 이내" 문자열 그대로 저장
    -- 카테고리 (URL 파라미터 기반)
    cat1_method        VARCHAR(30),               -- 요리방법: 볶음, 끓이기, 굽기 등
    cat2_situation     VARCHAR(30),               -- 상황: 일상, 손님접대, 다이어트 등
    cat3_ingredient    VARCHAR(30),               -- 주재료: 돼지고기, 소고기, 채소류 등
    cat4_type          VARCHAR(30),               -- 종류: 밑반찬, 메인반찬, 국/탕 등
    view_count         INT          NOT NULL DEFAULT 0,
    save_count         INT          NOT NULL DEFAULT 0,
    is_external        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (recipe_id),
    UNIQUE KEY uq_external_id (external_recipe_id),
    FOREIGN KEY (author_id) REFERENCES USER(user_id) ON DELETE SET NULL
);

-- =====================
-- RECIPE_INGREDIENT
-- (재료 / 양념 구분 포함)
-- =====================
CREATE TABLE RECIPE_INGREDIENT (
    ingredient_id BIGINT       NOT NULL AUTO_INCREMENT,
    recipe_id     BIGINT       NOT NULL,
    section       ENUM('재료','양념','기타') NOT NULL DEFAULT '재료', -- [재료] / [양념] 구분
    name          VARCHAR(100) NOT NULL,          -- 예: 돼지고기 앞다리살
    amount        VARCHAR(50),                    -- 예: 500g, 1쪽, 2개
    PRIMARY KEY (ingredient_id),
    FOREIGN KEY (recipe_id) REFERENCES RECIPE(recipe_id) ON DELETE CASCADE
);

-- =====================
-- RECIPE_STEP  ← YAMY 핵심
-- =====================
CREATE TABLE RECIPE_STEP (
    step_id       BIGINT  NOT NULL AUTO_INCREMENT,
    recipe_id     BIGINT  NOT NULL,
    step_order    INT     NOT NULL,
    description   TEXT    NOT NULL,              -- 조리 설명 텍스트
    image_url     VARCHAR(500),                  -- 단계별 이미지 URL
    heat_level    ENUM('약불','중불','강불'),      -- 단계 텍스트에서 파싱
    timer_seconds INT,                           -- "20분" → 1200, 없으면 NULL
    tip           TEXT,                          -- 이탤릭체 보조 텍스트 (예: "돼지고기는 선호하는 부위를...")
    PRIMARY KEY (step_id),
    FOREIGN KEY (recipe_id) REFERENCES RECIPE(recipe_id) ON DELETE CASCADE
);

-- =====================
-- SAVED_RECIPE
-- =====================
CREATE TABLE SAVED_RECIPE (
    saved_id  BIGINT   NOT NULL AUTO_INCREMENT,
    user_id   BIGINT   NOT NULL,
    recipe_id BIGINT   NOT NULL,
    saved_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (saved_id),
    UNIQUE KEY uq_user_recipe (user_id, recipe_id),
    FOREIGN KEY (user_id)   REFERENCES USER(user_id)     ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES RECIPE(recipe_id) ON DELETE CASCADE
);

-- =====================
-- INDEX
-- =====================
CREATE INDEX idx_recipe_external  ON RECIPE(external_recipe_id);
CREATE INDEX idx_recipe_author    ON RECIPE(author_id);
CREATE INDEX idx_recipe_cat4      ON RECIPE(cat4_type);
CREATE INDEX idx_recipe_cat2      ON RECIPE(cat2_situation);
CREATE INDEX idx_step_recipe_order ON RECIPE_STEP(recipe_id, step_order);
CREATE INDEX idx_ingredient_recipe ON RECIPE_INGREDIENT(recipe_id);
CREATE INDEX idx_saved_user       ON SAVED_RECIPE(user_id);