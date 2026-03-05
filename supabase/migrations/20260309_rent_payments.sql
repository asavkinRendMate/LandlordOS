-- PaymentStatus enum
create type "PaymentStatus" as enum ('PENDING', 'EXPECTED', 'RECEIVED', 'LATE', 'PARTIAL');

-- rent_payments table
create table rent_payments (
  id              uuid        primary key default gen_random_uuid(),
  tenancy_id      text        not null references tenancies(id) on delete cascade,
  amount          integer     not null,
  due_date        timestamptz not null,
  received_date   timestamptz,
  received_amount integer,
  status          "PaymentStatus" not null default 'PENDING',
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS
alter table rent_payments enable row level security;

-- Landlord: full access via tenancy → property → owner
create policy "Landlord manages rent payments"
  on rent_payments
  for all
  using (
    tenancy_id in (
      select t.id from tenancies t
      join properties p on p.id = t.property_id
      where p.user_id = auth.uid()::text
    )
  );

-- Tenant: read-only for their property's tenancies
create policy "Tenant reads own rent payments"
  on rent_payments
  for select
  using (
    tenancy_id in (
      select t.id from tenancies t
      join tenants tn on tn.property_id = t.property_id
      where tn.user_id = auth.uid()::text
        and tn.status in ('TENANT', 'INVITED')
    )
  );
