USE yamy;

CREATE TABLE RECIPE_TIP (
    tip_id        BIGINT NOT NULL AUTO_INCREMENT,
    recipe_id     BIGINT NOT NULL,
    tip_order     INT NOT NULL,
    content       TEXT NOT NULL,
    PRIMARY KEY (tip_id),
    FOREIGN KEY (recipe_id) REFERENCES RECIPE(recipe_id) ON DELETE CASCADE
);

CREATE INDEX idx_tip_recipe_order ON RECIPE_TIP(recipe_id, tip_order);

INSERT INTO RECIPE_TIP (recipe_id, tip_order, content)
SELECT recipe_id, step_order, tip
FROM RECIPE_STEP
WHERE tip IS NOT NULL
  AND TRIM(tip) <> '';
