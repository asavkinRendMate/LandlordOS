-- Tenant document management

CREATE TYPE "TenantDocumentType" AS ENUM (
  'PASSPORT',
  'RIGHT_TO_RENT',
  'PROOF_OF_INCOME',
  'BANK_STATEMENTS',
  'EMPLOYER_REFERENCE',
  'PREVIOUS_LANDLORD_REFERENCE',
  'GUARANTOR_AGREEMENT',
  'PET_AGREEMENT',
  'OTHER'
);

CREATE TABLE "tenant_documents" (
  "id"            TEXT                  NOT NULL,
  "tenant_id"     TEXT                  NOT NULL,
  "document_type" "TenantDocumentType"  NOT NULL,
  "file_name"     TEXT                  NOT NULL,
  "file_url"      TEXT                  NOT NULL,
  "file_size"     INTEGER               NOT NULL,
  "mime_type"     TEXT                  NOT NULL,
  "uploaded_by"   TEXT                  NOT NULL,
  "uploaded_at"   TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiry_date"   TIMESTAMP(3),
  "note"          TEXT,

  CONSTRAINT "tenant_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_documents_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
