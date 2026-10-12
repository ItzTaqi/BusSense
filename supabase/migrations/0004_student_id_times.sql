-- Account-side only (riders is never joined to location tables; the worker role has no access to it).
-- student_id: used only to look up the rider's assigned bus. TODO before real use: encrypt at rest or store a salted hash.
alter table riders add column if not exists student_id text;
alter table riders add column if not exists usual_pickup_time time;     -- when the bus usually comes (morning)
alter table riders add column if not exists school_dismissal_time time; -- when the bus usually leaves school (afternoon)
alter table riders drop constraint if exists riders_student_id_format;
alter table riders add constraint riders_student_id_format check (student_id is null or student_id ~ '^[0-9]{5,12}$');
