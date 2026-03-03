create table if not exists waitlist (
  id             uuid        primary key default gen_random_uuid(),
  email          text        not null unique,
  property_count text        not null
                             check (property_count in ('1', '2-3', '4-10', '10+')),
  created_at     timestamptz not null default now()
);
