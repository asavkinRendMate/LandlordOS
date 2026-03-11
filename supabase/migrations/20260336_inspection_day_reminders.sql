-- Add scheduledTime (HH:MM) and dayOfReminderSentAt to property_inspections
-- for time picker constraint (08:00–20:00) and day-of reminder deduplication.

ALTER TABLE "property_inspections"
  ADD COLUMN "scheduled_time" TEXT,
  ADD COLUMN "day_of_reminder_sent_at" TIMESTAMPTZ;
