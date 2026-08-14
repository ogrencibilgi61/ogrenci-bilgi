alter table public.parent_notes
  add column if not exists reminder_date date not null default current_date;
