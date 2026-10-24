DROP TABLE IF EXISTS question_option;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'question_image' AND COLUMN_NAME = 'position') > 0,
  'ALTER TABLE question_image DROP COLUMN position',
  'SELECT 1'
);
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
