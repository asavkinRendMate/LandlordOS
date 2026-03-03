-- Core schema: users, properties, compliance_docs, tenancies
-- Enums use Prisma-compatible naming conventions

-- ── Enums ─────────────────────────────────────────────────────────────────────

create type "PropertyType" as enum ('FLAT', 'HOUSE', 'HMO', 'OTHER');
create type "PropertyStatus" as enum ('VACANT', 'APPLICATION_OPEN', 'OFFER_ACCEPTED', 'ACTIVE', 'NOTICE_GIVEN');
create type "ComplianceDocType" as enum ('GAS_SAFETY', 'EPC', 'EICR', 'HOW_TO_RENT');
create type "ComplianceDocStatus" as enum ('MISSING', 'VALID', 'EXPIRING', 'EXPIRED');
create type "TenancyStatus" as enum ('PENDING', 'ACTIVE', 'NOTICE_GIVEN', 'ENDED');

-- ── Users ─────────────────────────────────────────────────────────────────────
-- Mirrors auth.users — id is the Supabase user UUID (as text for Prisma compat)

create table if not exists users (
  id         text        primary key,
  email      text        not null unique,
  name       text,
  created_at timestamptz not null default now()
);

-- Auto-create a users row whenever someone signs up via Supabase auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id::text, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Properties ────────────────────────────────────────────────────────────────

create table if not exists properties (
  id                text             primary key,
  user_id           text             not null references users(id) on delete cascade,
  line1             text             not null,
  line2             text,
  city              text             not null,
  postcode          text             not null,
  type              "PropertyType"   not null default 'FLAT',
  status            "PropertyStatus" not null default 'VACANT',
  application_token text             unique,
  created_at        timestamptz      not null default now(),
  updated_at        timestamptz      not null default now()
);

-- ── Compliance Docs ───────────────────────────────────────────────────────────

create table if not exists compliance_docs (
  id           text                  primary key,
  property_id  text                  not null references properties(id) on delete cascade,
  type         "ComplianceDocType"   not null,
  status       "ComplianceDocStatus" not null default 'MISSING',
  file_url     text,
  issued_date  timestamptz,
  expiry_date  timestamptz,
  issued       boolean               not null default false,
  version      text,
  ai_extracted boolean               not null default false,
  created_at   timestamptz           not null default now(),
  updated_at   timestamptz           not null default now(),
  unique (property_id, type)
);

-- ── Tenancies ─────────────────────────────────────────────────────────────────

create table if not exists tenancies (
  id                   text            primary key,
  property_id          text            not null references properties(id) on delete cascade,
  tenant_name          text,
  tenant_email         text,
  tenant_phone         text,
  start_date           timestamptz,
  end_date             timestamptz,
  monthly_rent         integer,
  payment_day          integer,
  status               "TenancyStatus" not null default 'PENDING',
  deposit_amount       integer,
  deposit_scheme       text,
  deposit_ref          text,
  deposit_protected    boolean         not null default false,
  deposit_protected_at timestamptz,
  portal_token         text            unique,
  contract_url         text,
  created_at           timestamptz     not null default now(),
  updated_at           timestamptz     not null default now()
);

-- ── updated_at triggers ───────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger properties_updated_at
  before update on properties
  for each row execute function update_updated_at();

create trigger compliance_docs_updated_at
  before update on compliance_docs
  for each row execute function update_updated_at();

create trigger tenancies_updated_at
  before update on tenancies
  for each row execute function update_updated_at();
