alter table dispatch_queue
  add column if not exists additional_recipients text null;
