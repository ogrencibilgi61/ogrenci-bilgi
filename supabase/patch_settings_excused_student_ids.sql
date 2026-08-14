alter table public.settings
  add column if not exists excused_student_ids jsonb not null default '[]'::jsonb;
