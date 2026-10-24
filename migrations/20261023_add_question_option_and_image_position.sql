CREATE TABLE IF NOT EXISTS question_option (
  id INT NOT NULL AUTO_INCREMENT,
  label VARCHAR(2) NOT NULL,
  `text` TEXT NOT NULL,
  `order` INT NOT NULL,
  questionId INT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NULL,
  updatedAt DATETIME NULL,
  createdByUser INT NULL,
  updatedByUser INT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY UQ_question_option (questionId, label),
  CONSTRAINT FK_question_option_question FOREIGN KEY (questionId) REFERENCES question (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'question_image' AND COLUMN_NAME = 'position') = 0,
  'ALTER TABLE question_image ADD COLUMN position VARCHAR(10) NOT NULL DEFAULT ''before''',
  'SELECT 1'
);
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
