-- Create DocumentType enum
create type "DocumentType" as enum (
  'GAS_SAFETY',
  'EPC',
  'EICR',
  'HOW_TO_RENT',
  'TENANCY_AGREEMENT',
  'INVENTORY_REPORT',
  'DEPOSIT_CERTIFICATE',
  'RIGHT_TO_RENT',
  'BUILDING_INSURANCE',
  'LANDLORD_INSURANCE',
  'SECTION_13_NOTICE',
  'SECTION_8_NOTICE',
  'CHECKOUT_INVENTORY',
  'OTHER'
);

-- Create property_documents table
create table property_documents (
  id            uuid primary key default gen_random_uuid(),
  property_id   text not null references properties(id) on delete cascade,
  document_type "DocumentType" not null,
  file_name     text not null,
  file_url      text not null,
  file_size     integer not null,
  mime_type     text not null,
  uploaded_at   timestamptz not null default now(),
  expiry_date   timestamptz
);

-- Create document_acknowledgments table
create table document_acknowledgments (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references property_documents(id) on delete cascade,
  tenant_id       text not null references tenants(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (document_id, tenant_id)
);

-- Enable RLS
alter table property_documents enable row level security;
alter table document_acknowledgments enable row level security;

-- property_documents: landlord (owner) can do anything
create policy "Landlord manages documents"
  on property_documents
  for all
  using (
    property_id in (
      select id from properties where user_id = auth.uid()::text
    )
  );

-- property_documents: tenant can read docs for their property
create policy "Tenant reads own property documents"
  on property_documents
  for select
  using (
    property_id in (
      select property_id from tenants
      where user_id = auth.uid()::text
        and status in ('TENANT', 'INVITED')
    )
  );

-- document_acknowledgments: tenant manages their own
create policy "Tenant manages own acknowledgments"
  on document_acknowledgments
  for all
  using (
    tenant_id in (
      select id from tenants where user_id = auth.uid()::text
    )
  );

-- document_acknowledgments: landlord can read acks for their docs
create policy "Landlord reads acknowledgments"
  on document_acknowledgments
  for select
  using (
    document_id in (
      select pd.id from property_documents pd
      join properties p on p.id = pd.property_id
      where p.user_id = auth.uid()::text
    )
  );
