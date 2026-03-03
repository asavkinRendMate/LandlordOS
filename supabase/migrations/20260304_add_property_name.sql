-- Add optional friendly name / nickname to properties
alter table properties add column if not exists name text;
