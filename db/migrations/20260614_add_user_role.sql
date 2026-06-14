USE yamy;

ALTER TABLE `USER`
    ADD COLUMN role ENUM('user', 'admin')
    NOT NULL DEFAULT 'user'
    AFTER profile_image_url;
