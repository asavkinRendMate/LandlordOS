-- Add bedrooms to properties
ALTER TABLE "properties" ADD COLUMN "bedrooms" INTEGER;

-- Room type enum
CREATE TYPE "RoomType" AS ENUM (
  'BEDROOM', 'LIVING_ROOM', 'KITCHEN', 'BATHROOM', 'WC',
  'HALLWAY', 'DINING_ROOM', 'UTILITY_ROOM', 'GARDEN',
  'GARAGE', 'LOFT', 'CONSERVATORY', 'OTHER'
);

-- Check-in report status enum
CREATE TYPE "CheckInReportStatus" AS ENUM (
  'DRAFT', 'PENDING', 'IN_REVIEW', 'AGREED', 'DISPUTED'
);

-- Property rooms
CREATE TABLE "property_rooms" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "property_id" TEXT NOT NULL,
  "type" "RoomType" NOT NULL,
  "name" TEXT NOT NULL,
  "floor" INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_rooms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "property_rooms_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Check-in reports
CREATE TABLE "check_in_reports" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "property_id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "status" "CheckInReportStatus" NOT NULL DEFAULT 'DRAFT',
  "token" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "landlord_confirmed_at" TIMESTAMP(3),
  "tenant_confirmed_at" TIMESTAMP(3),
  "pdf_url" TEXT,
  "pdf_generated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "check_in_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "check_in_reports_token_key" UNIQUE ("token"),
  CONSTRAINT "check_in_reports_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "check_in_reports_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Check-in photos (GDPR: retained for tenancy + 3 months)
CREATE TABLE "check_in_photos" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "report_id" TEXT NOT NULL,
  "room_id" TEXT,
  "room_name" TEXT NOT NULL,
  "uploaded_by" TEXT NOT NULL,
  "uploader_name" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "caption" TEXT,
  "condition" TEXT,
  "taken_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "check_in_photos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "check_in_photos_report_id_fkey"
    FOREIGN KEY ("report_id") REFERENCES "check_in_reports"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "check_in_photos_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "property_rooms"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
