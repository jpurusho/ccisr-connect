-- Migrate existing newcomers from is_newcomer flag to Newcomer tag
-- Run this once after deploying the tag-based newcomer feature

INSERT INTO member_tags (member_id, tag_id)
SELECT m.id, t.id
FROM members m
CROSS JOIN tags t
WHERE m.is_newcomer = true
  AND t.name = 'Newcomer'
  AND NOT EXISTS (
    SELECT 1 FROM member_tags mt
    WHERE mt.member_id = m.id AND mt.tag_id = t.id
  );
