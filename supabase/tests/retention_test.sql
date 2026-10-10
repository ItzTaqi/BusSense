-- Run in the SQL editor. Proves raw points are gone after trip end and after the 6 h cap.
-- Everything is rolled back at the end. Each "select" prints PASS or FAIL.
begin;
insert into trip_points(trip_token, t, geom) values
 ('00000000-0000-0000-0000-000000000001', now(), 'POINT(-78.78 35.79)'),
 ('00000000-0000-0000-0000-000000000002', now() - interval '7 hours', 'POINT(-78.78 35.79)'),
 ('00000000-0000-0000-0000-000000000003', now(), 'POINT(-78.78 35.79)');
select end_trip('00000000-0000-0000-0000-000000000001', true, 3);
select run_retention();
select case when count(*) = 1 then 'PASS: only the live recent token remains' else 'FAIL' end
  from trip_points;
select case when exists (select 1 from trip_points where trip_token='00000000-0000-0000-0000-000000000001'
 or trip_token='00000000-0000-0000-0000-000000000002') then 'FAIL' else 'PASS: ended + stale tokens gone' end;
rollback;
