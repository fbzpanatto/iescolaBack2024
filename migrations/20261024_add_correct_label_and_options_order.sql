SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'question' AND COLUMN_NAME = 'correctLabel') = 0,
  'ALTER TABLE question ADD COLUMN correctLabel VARCHAR(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'test_question' AND COLUMN_NAME = 'optionsOrder') = 0,
  'ALTER TABLE test_question ADD COLUMN optionsOrder VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE question q
JOIN (
  SELECT tq.questionId, UPPER(TRIM(tq.answer)) COLLATE utf8mb4_bin AS ans
  FROM test_question tq
  JOIN (SELECT questionId, MIN(id) AS minId FROM test_question GROUP BY questionId) f ON f.minId = tq.id
) a ON a.questionId = q.id
SET q.correctLabel = a.ans
WHERE q.correctLabel IS NULL
  AND CHAR_LENGTH(a.ans) = 1
  AND EXISTS (SELECT 1 FROM question_option qo WHERE qo.questionId = q.id AND qo.active = 1 AND qo.label = a.ans);
