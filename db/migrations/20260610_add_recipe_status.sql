USE yamy;

SET @sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'RECIPE'
          AND COLUMN_NAME = 'status'
    ),
    'SELECT 1',
    'ALTER TABLE RECIPE
       ADD COLUMN status ENUM(''draft'', ''published'')
       NOT NULL DEFAULT ''published''
       AFTER cat4_type'
);
PREPARE statement FROM @sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;

ALTER TABLE RECIPE
    MODIFY COLUMN thumbnail_url LONGTEXT;

ALTER TABLE RECIPE_STEP
    MODIFY COLUMN image_url LONGTEXT;
