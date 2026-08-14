insert into public.cities (id, name, status, created_at)
values
  ('7c1a3e0e-5a6b-4ad8-9864-527d9f2a9001', 'Istanbul', 'active', '2026-07-01T09:00:00.000Z'),
  ('7c1a3e0e-5a6b-4ad8-9864-527d9f2a9002', 'Ankara', 'active', '2026-07-01T09:10:00.000Z')
on conflict (id) do update
set name = excluded.name,
    status = excluded.status;

insert into public.institutions (id, city_id, name, status, created_at, updated_at)
values
  ('1c2b03c4-95d0-4663-9a96-9e5370e21001', '7c1a3e0e-5a6b-4ad8-9864-527d9f2a9001', 'Kadikoy Minikler Akademisi', 'active', '2026-07-01T10:00:00.000Z', now()),
  ('1c2b03c4-95d0-4663-9a96-9e5370e21002', '7c1a3e0e-5a6b-4ad8-9864-527d9f2a9001', 'Besiktas Etut Merkezi', 'active', '2026-07-01T10:15:00.000Z', now()),
  ('1c2b03c4-95d0-4663-9a96-9e5370e21003', '7c1a3e0e-5a6b-4ad8-9864-527d9f2a9002', 'Cankaya Cocuk Kulubu', 'active', '2026-07-01T10:30:00.000Z', now())
on conflict (id) do update
set city_id = excluded.city_id,
    name = excluded.name,
    status = excluded.status,
    updated_at = now();

insert into public.settings (
  id,
  institution_id,
  institution_name,
  institution_phone,
  institution_address,
  absence_threshold,
  classes,
  staff_members,
  updated_at
)
values
  (
    '6a2dce70-e42f-4c7e-86b4-c15a5e43d001',
    '1c2b03c4-95d0-4663-9a96-9e5370e21001',
    'Kadikoy Minikler Akademisi',
    '+902164445566',
    'Kadikoy, Istanbul',
    3,
    '["A Grubu", "B Grubu"]'::jsonb,
    '[]'::jsonb,
    now()
  ),
  (
    '6a2dce70-e42f-4c7e-86b4-c15a5e43d002',
    '1c2b03c4-95d0-4663-9a96-9e5370e21002',
    'Besiktas Etut Merkezi',
    '+902122223344',
    'Besiktas, Istanbul',
    4,
    '["Hazirlik"]'::jsonb,
    '[]'::jsonb,
    now()
  ),
  (
    '6a2dce70-e42f-4c7e-86b4-c15a5e43d003',
    '1c2b03c4-95d0-4663-9a96-9e5370e21003',
    'Cankaya Cocuk Kulubu',
    '+903124445566',
    'Cankaya, Ankara',
    3,
    '["C Grubu"]'::jsonb,
    '[]'::jsonb,
    now()
  )
on conflict (institution_id) do update
set institution_name = excluded.institution_name,
    institution_phone = excluded.institution_phone,
    institution_address = excluded.institution_address,
    absence_threshold = excluded.absence_threshold,
    classes = excluded.classes,
    staff_members = excluded.staff_members,
    updated_at = now();

insert into public.students (
  id,
  institution_id,
  first_name,
  last_name,
  full_name,
  class_name,
  parent_name,
  parent_phone,
  status
)
values
  ('2e0d7c88-87ca-4e92-b8c0-84f4c8f6f001', '1c2b03c4-95d0-4663-9a96-9e5370e21001', 'Deniz', 'Arslan', 'Deniz Arslan', 'A Grubu', 'Selin Arslan', '+905321112233', 'active'),
  ('2e0d7c88-87ca-4e92-b8c0-84f4c8f6f002', '1c2b03c4-95d0-4663-9a96-9e5370e21001', 'Ege', 'Demir', 'Ege Demir', 'A Grubu', 'Mert Demir', '+905323334455', 'active'),
  ('2e0d7c88-87ca-4e92-b8c0-84f4c8f6f003', '1c2b03c4-95d0-4663-9a96-9e5370e21001', 'Ada', 'Yilmaz', 'Ada Yilmaz', 'B Grubu', 'Aylin Yilmaz', '+905345556677', 'graduated'),
  ('2e0d7c88-87ca-4e92-b8c0-84f4c8f6f004', '1c2b03c4-95d0-4663-9a96-9e5370e21002', 'Mina', 'Kaya', 'Mina Kaya', 'Hazirlik', 'Bora Kaya', '+905365557788', 'active'),
  ('2e0d7c88-87ca-4e92-b8c0-84f4c8f6f005', '1c2b03c4-95d0-4663-9a96-9e5370e21003', 'Can', 'Oz', 'Can Oz', 'C Grubu', 'Nehir Oz', '+905378889900', 'active')
on conflict (id) do update
set first_name = excluded.first_name,
    last_name = excluded.last_name,
    full_name = excluded.full_name,
    class_name = excluded.class_name,
    parent_name = excluded.parent_name,
    parent_phone = excluded.parent_phone,
    status = excluded.status;

insert into public.message_templates (id, institution_id, title, body, created_at, updated_at)
values (
  '7f2e2f82-0e44-4a8d-a4db-09b42f900001',
  '1c2b03c4-95d0-4663-9a96-9e5370e21001',
  'Devamsızlık bildirimi',
  'Sayın {veli_adi}, {ogrenci_adi} adlı öğrencimiz {tarih} tarihinde yoklamada gelmedi olarak işaretlenmiştir. Toplam devamsızlık sayısı: {toplam_devamsizlik}. {kurum_adi}',
  '2026-07-01T11:00:00.000Z',
  now()
)
on conflict (id) do update
set title = excluded.title,
    body = excluded.body,
    updated_at = now();
