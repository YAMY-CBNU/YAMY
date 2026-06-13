USE yamy;

DROP TABLE IF EXISTS RECIPE_REVIEW;

CREATE TABLE IF NOT EXISTS RECIPE_RATING (
    rating_id  BIGINT   NOT NULL AUTO_INCREMENT,
    recipe_id  BIGINT   NOT NULL,
    user_id    BIGINT   NOT NULL,
    rating     TINYINT  NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (rating_id),
    UNIQUE KEY uq_rating_user_recipe (user_id, recipe_id),
    CONSTRAINT chk_recipe_rating CHECK (rating BETWEEN 1 AND 5),
    FOREIGN KEY (user_id)   REFERENCES USER(user_id)     ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES RECIPE(recipe_id) ON DELETE CASCADE,
    INDEX idx_rating_recipe (recipe_id)
);

CREATE TABLE IF NOT EXISTS RECIPE_COMMENT (
    comment_id BIGINT        NOT NULL AUTO_INCREMENT,
    recipe_id  BIGINT        NOT NULL,
    user_id    BIGINT        NOT NULL,
    content    VARCHAR(1000) NOT NULL,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id),
    FOREIGN KEY (user_id)   REFERENCES USER(user_id)     ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES RECIPE(recipe_id) ON DELETE CASCADE,
    INDEX idx_comment_recipe_created (recipe_id, created_at),
    INDEX idx_comment_user (user_id)
);
