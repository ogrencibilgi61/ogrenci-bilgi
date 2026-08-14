insert into public.institution_managers (institution_id, user_id, status)
values
  ('1c2b03c4-95d0-4663-9a96-9e5370e21001', '80c6e913-c031-4789-a202-21040417f586', 'active'),
  ('1c2b03c4-95d0-4663-9a96-9e5370e21002', '2e994733-6697-41f2-b461-c8d43b48ea05', 'active'),
  ('1c2b03c4-95d0-4663-9a96-9e5370e21003', 'c1aff02d-8477-4e22-afcb-2a82b2c6e77f', 'active')
on conflict (institution_id, user_id) do update
set status = excluded.status;
