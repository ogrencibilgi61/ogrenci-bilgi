create extension if not exists pgcrypto;

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  created_at timestamp not null default now()
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  name text not null,
  student_gender text,
  status text not null default 'active',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

alter table public.institutions
  add column if not exists student_gender text;

create table if not exists public.institution_managers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  created_at timestamp not null default now(),
  unique (institution_id, user_id)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  first_name text not null default '',
  last_name text not null default '',
  full_name text not null,
  class_name text,
  parent_name text,
  parent_phone text,
  status text not null default 'active',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  unique (id, institution_id)
);

alter table public.students
  add column if not exists first_name text not null default '';

alter table public.students
  add column if not exists last_name text not null default '';

alter table public.students
  add column if not exists full_name text not null default '';

alter table public.students
  add column if not exists exit_reason text;

alter table public.students
  add column if not exists exited_at timestamp;

alter table public.students
  add column if not exists gender text;

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  student_id uuid not null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'excused')),
  created_at timestamp not null default now(),
  foreign key (student_id, institution_id)
    references public.students(id, institution_id)
    on delete cascade,
  unique (institution_id, student_id, date)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  student_id uuid not null,
  attendance_date date,
  body text not null,
  status text not null default 'hazir',
  sent_at timestamp,
  created_at timestamp not null default now(),
  foreign key (student_id, institution_id)
    references public.students(id, institution_id)
    on delete cascade
);

alter table public.messages
  add column if not exists attendance_date date;

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.parent_notes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  student_id uuid not null,
  note text not null,
  note_type text,
  reminder_date date not null default current_date,
  created_at timestamp not null default now(),
  foreign key (student_id, institution_id)
    references public.students(id, institution_id)
    on delete cascade
);

alter table public.parent_notes
  add column if not exists reminder_date date not null default current_date;

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null unique references public.institutions(id) on delete cascade,
  institution_name text,
  institution_phone text,
  absence_threshold integer not null default 3,
  updated_at timestamp not null default now()
);

alter table public.settings
  add column if not exists institution_name text;

alter table public.settings
  add column if not exists institution_phone text;

alter table public.settings
  add column if not exists institution_address text;

alter table public.settings
  add column if not exists institution_capacity integer not null default 0;

alter table public.settings
  add column if not exists classes jsonb not null default '[]'::jsonb;

alter table public.settings
  add column if not exists staff_members jsonb not null default '[]'::jsonb;

alter table public.settings
  add column if not exists excused_student_ids jsonb not null default '[]'::jsonb;

create index if not exists institutions_city_id_idx
  on public.institutions(city_id);

create index if not exists institution_managers_user_id_idx
  on public.institution_managers(user_id);

create index if not exists students_institution_id_idx
  on public.students(institution_id);

create index if not exists attendance_institution_date_idx
  on public.attendance(institution_id, date);

create index if not exists attendance_student_id_idx
  on public.attendance(student_id);

create index if not exists messages_institution_id_idx
  on public.messages(institution_id);

create index if not exists messages_student_id_idx
  on public.messages(student_id);

create index if not exists message_templates_institution_id_idx
  on public.message_templates(institution_id);

create index if not exists parent_notes_institution_id_idx
  on public.parent_notes(institution_id);

create index if not exists parent_notes_student_id_idx
  on public.parent_notes(student_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists institutions_set_updated_at on public.institutions;
create trigger institutions_set_updated_at
before update on public.institutions
for each row
execute function public.set_updated_at();

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

drop trigger if exists message_templates_set_updated_at on public.message_templates;
create trigger message_templates_set_updated_at
before update on public.message_templates
for each row
execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();

create or replace function public.current_institution_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.institution_id', true), '')::uuid,
    nullif(current_setting('app.current_institution_id', true), '')::uuid,
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'institution_id')::uuid,
    (
      select institution_managers.institution_id
      from public.institution_managers
      where institution_managers.user_id = auth.uid()
        and institution_managers.status = 'active'
      limit 1
    )
  );
$$;

create or replace function public.can_access_institution(target_institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_institution_id = public.current_institution_id();
$$;

alter table public.cities enable row level security;
alter table public.institutions enable row level security;
alter table public.institution_managers enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.messages enable row level security;
alter table public.message_templates enable row level security;
alter table public.parent_notes enable row level security;
alter table public.settings enable row level security;

revoke all on public.institutions from anon, authenticated;
grant select on public.cities to anon, authenticated;
grant select (id, city_id, name, student_gender, status, created_at, updated_at)
  on public.institutions
  to anon, authenticated;
grant select on public.institution_managers to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.attendance to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.message_templates to authenticated;
grant select, insert, update, delete on public.parent_notes to authenticated;
grant select, insert, update on public.settings to authenticated;

drop policy if exists cities_active_select on public.cities;
create policy cities_active_select
on public.cities
for select
to anon, authenticated
using (status = 'active');

drop policy if exists institutions_active_select on public.institutions;
create policy institutions_active_select
on public.institutions
for select
to anon, authenticated
using (status = 'active');

drop policy if exists institution_managers_own_select on public.institution_managers;
create policy institution_managers_own_select
on public.institution_managers
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists students_manager_select on public.students;
create policy students_manager_select
on public.students
for select
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists students_manager_insert on public.students;
create policy students_manager_insert
on public.students
for insert
to authenticated
with check (public.can_access_institution(institution_id));

drop policy if exists students_manager_update on public.students;
create policy students_manager_update
on public.students
for update
to authenticated
using (public.can_access_institution(institution_id))
with check (public.can_access_institution(institution_id));

drop policy if exists students_manager_delete on public.students;
create policy students_manager_delete
on public.students
for delete
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists attendance_manager_select on public.attendance;
create policy attendance_manager_select
on public.attendance
for select
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists attendance_manager_insert on public.attendance;
create policy attendance_manager_insert
on public.attendance
for insert
to authenticated
with check (public.can_access_institution(institution_id));

drop policy if exists attendance_manager_update on public.attendance;
create policy attendance_manager_update
on public.attendance
for update
to authenticated
using (public.can_access_institution(institution_id))
with check (public.can_access_institution(institution_id));

drop policy if exists attendance_manager_delete on public.attendance;
create policy attendance_manager_delete
on public.attendance
for delete
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists messages_manager_select on public.messages;
create policy messages_manager_select
on public.messages
for select
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists messages_manager_insert on public.messages;
create policy messages_manager_insert
on public.messages
for insert
to authenticated
with check (public.can_access_institution(institution_id));

drop policy if exists messages_manager_update on public.messages;
create policy messages_manager_update
on public.messages
for update
to authenticated
using (public.can_access_institution(institution_id))
with check (public.can_access_institution(institution_id));

drop policy if exists messages_manager_delete on public.messages;
create policy messages_manager_delete
on public.messages
for delete
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists message_templates_manager_select on public.message_templates;
create policy message_templates_manager_select
on public.message_templates
for select
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists message_templates_manager_insert on public.message_templates;
create policy message_templates_manager_insert
on public.message_templates
for insert
to authenticated
with check (public.can_access_institution(institution_id));

drop policy if exists message_templates_manager_update on public.message_templates;
create policy message_templates_manager_update
on public.message_templates
for update
to authenticated
using (public.can_access_institution(institution_id))
with check (public.can_access_institution(institution_id));

drop policy if exists message_templates_manager_delete on public.message_templates;
create policy message_templates_manager_delete
on public.message_templates
for delete
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists parent_notes_manager_select on public.parent_notes;
create policy parent_notes_manager_select
on public.parent_notes
for select
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists parent_notes_manager_insert on public.parent_notes;
create policy parent_notes_manager_insert
on public.parent_notes
for insert
to authenticated
with check (public.can_access_institution(institution_id));

drop policy if exists parent_notes_manager_update on public.parent_notes;
create policy parent_notes_manager_update
on public.parent_notes
for update
to authenticated
using (public.can_access_institution(institution_id))
with check (public.can_access_institution(institution_id));

drop policy if exists parent_notes_manager_delete on public.parent_notes;
create policy parent_notes_manager_delete
on public.parent_notes
for delete
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists settings_manager_select on public.settings;
create policy settings_manager_select
on public.settings
for select
to authenticated
using (public.can_access_institution(institution_id));

drop policy if exists settings_manager_insert on public.settings;
create policy settings_manager_insert
on public.settings
for insert
to authenticated
with check (public.can_access_institution(institution_id));

drop policy if exists settings_manager_update on public.settings;
create policy settings_manager_update
on public.settings
for update
to authenticated
using (public.can_access_institution(institution_id))
with check (public.can_access_institution(institution_id));
