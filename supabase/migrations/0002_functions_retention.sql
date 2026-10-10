-- Rate limit keyed by trip_token (not by user) so the location stream carries no identity.
create table rate_limits (trip_token uuid primary key, last_at timestamptz not null);
alter table rate_limits enable row level security;

-- End a trip: record the receipt, delete that token's raw points.
create or replace function end_trip(p_token uuid, p_published boolean, p_max_riders int)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from trip_points where trip_token = p_token;
  delete from rate_limits where trip_token = p_token;
  insert into trip_ends(trip_token, published, max_riders) values (p_token, p_published, p_max_riders)
  on conflict (trip_token) do update set ended_at = now(), published = excluded.published,
    max_riders = excluded.max_riders;
end $$;
revoke all on function end_trip from public, anon, authenticated;

-- Retention: ended tokens, anything > 6 h, tracks > 24 h, reports > 30 d. Logs counts.
create or replace function run_retention() returns void language plpgsql security definer
set search_path = public as $$
declare p int; tr int;
begin
  with d as (delete from trip_points tp
    where tp.t < now() - interval '6 hours'
       or exists (select 1 from trip_ends e where e.trip_token = tp.trip_token)
    returning 1) select count(*) into p from d;
  with d as (delete from bus_tracks where t < now() - interval '24 hours' returning 1)
    select count(*) into tr from d;
  delete from reports where t < now() - interval '30 days';
  delete from rate_limits where last_at < now() - interval '6 hours';
  insert into retention_log(points_deleted, tracks_deleted) values (p, tr);
end $$;
revoke all on function run_retention from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('goyellow-retention', '*/10 * * * *', $$select run_retention()$$);
