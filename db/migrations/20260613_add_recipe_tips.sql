USE yamy;

CREATE TABLE IF NOT EXISTS RECIPE_TIP (
    tip_id        BIGINT NOT NULL AUTO_INCREMENT,
    recipe_id     BIGINT NOT NULL,
    tip_order     INT NOT NULL,
    content       TEXT NOT NULL,
    PRIMARY KEY (tip_id),
    FOREIGN KEY (recipe_id) REFERENCES RECIPE(recipe_id) ON DELETE CASCADE,
    INDEX idx_tip_recipe_order (recipe_id, tip_order)
);

INSERT INTO RECIPE_TIP (recipe_id, tip_order, content)
SELECT recipe_step.recipe_id, recipe_step.step_order, recipe_step.tip
FROM RECIPE_STEP recipe_step
WHERE recipe_step.tip IS NOT NULL
  AND TRIM(recipe_step.tip) <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM RECIPE_TIP recipe_tip
      WHERE recipe_tip.recipe_id = recipe_step.recipe_id
        AND recipe_tip.tip_order = recipe_step.step_order
        AND recipe_tip.content = recipe_step.tip
  );
