USE yamy;

ALTER TABLE RECIPE
    ADD COLUMN status ENUM('draft', 'published')
    NOT NULL DEFAULT 'published'
    AFTER cat4_type;

ALTER TABLE RECIPE
    MODIFY COLUMN thumbnail_url LONGTEXT;

ALTER TABLE RECIPE_STEP
    MODIFY COLUMN image_url LONGTEXT;
