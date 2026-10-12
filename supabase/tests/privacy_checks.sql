-- Run after migrations. Each query must return zero rows.
select table_name, column_name from information_schema.columns
 where table_schema='public'
   and table_name in ('trip_points','bus_tracks','bus_status','segment_times','trip_ends')
   and column_name in ('user_id','rider_id','follower_id','id','email');
select tablename from pg_tables where schemaname='public' and not rowsecurity;
select table_name from information_schema.role_table_grants
 where grantee='goyellow_worker' and table_name in ('riders','followers','follows');

-- Added with the Swift backend (0005). Each query must return zero rows:
-- the clustering worker and the dispatcher must never read riders (birth year, student id, school).
select grantee, table_name from information_schema.role_table_grants
 where grantee in ('goyellow_worker', 'goyellow_dispatch') and table_name = 'riders';
-- the dispatcher must never read raw location points.
select table_name from information_schema.role_table_grants where grantee = 'goyellow_dispatch' and table_name = 'trip_points';
