alter table public.institutions
  add column if not exists student_gender text;

alter table public.settings
  add column if not exists institution_capacity integer not null default 0;

grant select (id, city_id, name, student_gender, status, created_at, updated_at)
  on public.institutions
  to anon, authenticated;
