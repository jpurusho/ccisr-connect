SELECT 
  et.id,
  et.name,
  et.comm_type,
  email.subject_template,
  email.body_template
FROM event_types et
LEFT JOIN email_templates email ON email.id = et.default_template_id
WHERE et.comm_type = 'bible_study';
