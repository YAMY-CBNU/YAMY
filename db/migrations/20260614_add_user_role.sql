USE yamy;

SET @sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'USER'
          AND COLUMN_NAME = 'role'
    ),
    'SELECT 1',
    'ALTER TABLE `USER`
       ADD COLUMN role ENUM(''user'', ''admin'')
       NOT NULL DEFAULT ''user''
       AFTER profile_image_url'
);
PREPARE statement FROM @sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;
