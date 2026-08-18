begin;

delete from public.parent_notes
where institution_id in (
  '1c2b03c4-95d0-4663-9a96-9e5370e21001',
  '1c2b03c4-95d0-4663-9a96-9e5370e21002',
  '1c2b03c4-95d0-4663-9a96-9e5370e21003'
);

delete from public.messages
where institution_id in (
  '1c2b03c4-95d0-4663-9a96-9e5370e21001',
  '1c2b03c4-95d0-4663-9a96-9e5370e21002',
  '1c2b03c4-95d0-4663-9a96-9e5370e21003'
);

delete from public.attendance
where institution_id in (
  '1c2b03c4-95d0-4663-9a96-9e5370e21001',
  '1c2b03c4-95d0-4663-9a96-9e5370e21002',
  '1c2b03c4-95d0-4663-9a96-9e5370e21003'
);

delete from public.message_templates
where institution_id in (
  '1c2b03c4-95d0-4663-9a96-9e5370e21001',
  '1c2b03c4-95d0-4663-9a96-9e5370e21002',
  '1c2b03c4-95d0-4663-9a96-9e5370e21003'
);

delete from public.settings
where institution_id in (
  '1c2b03c4-95d0-4663-9a96-9e5370e21001',
  '1c2b03c4-95d0-4663-9a96-9e5370e21002',
  '1c2b03c4-95d0-4663-9a96-9e5370e21003'
);

delete from public.institution_managers
where institution_id in (
  '1c2b03c4-95d0-4663-9a96-9e5370e21001',
  '1c2b03c4-95d0-4663-9a96-9e5370e21002',
  '1c2b03c4-95d0-4663-9a96-9e5370e21003'
);

delete from public.students
where institution_id in (
  '1c2b03c4-95d0-4663-9a96-9e5370e21001',
  '1c2b03c4-95d0-4663-9a96-9e5370e21002',
  '1c2b03c4-95d0-4663-9a96-9e5370e21003'
);

delete from public.institutions
where id in (
  '1c2b03c4-95d0-4663-9a96-9e5370e21001',
  '1c2b03c4-95d0-4663-9a96-9e5370e21002',
  '1c2b03c4-95d0-4663-9a96-9e5370e21003'
);

delete from public.cities
where id in (
  '7c1a3e0e-5a6b-4ad8-9864-527d9f2a9001',
  '7c1a3e0e-5a6b-4ad8-9864-527d9f2a9002'
);

commit;
