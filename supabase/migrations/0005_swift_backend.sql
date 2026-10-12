-- Backend for the Swift app. The TypeScript edge functions are replaced by SQL functions the app calls over PostgREST
-- (rest/v1/rpc/<name>) plus the Swift worker. Every function runs as the caller (anonymous sign-in users are the
-- `authenticated` role) and uses SECURITY DEFINER only where it must touch tables the caller cannot.
-- Location rows never carry a user id: the rider's identity is used to check their bus window, then dropped.

-- ===== weekly AI summaries (written by the Swift worker, read by parents) =====
create table if not exists weekly_summaries (
  route_label text not null,
  week_start date not null,
  summary text not null,
  created_at timestamptz not null default now(),
  primary key (route_label, week_start)
);
alter table weekly_summaries enable row level security;
drop policy if exists summaries_read on weekly_summaries;
create policy summaries_read on weekly_summaries for select to authenticated using (true);

-- Two database roles, so the clustering worker never sees anything account-related:
--   goyellow_worker    (already exists) anonymous location data only: trip_points, bus_tracks, bus_status, routes, stops...
--   goyellow_dispatch  sends alerts and writes weekly summaries: reads follows/followers (bus, stop, walk minutes, push token,
--                      alert prefs: no name, no location), bus_status and reports (no user ids). It cannot read riders or trip_points.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'goyellow_dispatch') then
    create role goyellow_dispatch login password 'CHANGE_ME_IN_DASHBOARD' bypassrls;
  end if;
end $$;
revoke all on riders, trip_points, trip_ends, bus_tracks from goyellow_dispatch;
grant usage on schema public to goyellow_dispatch;
grant select on follows, followers, bus_status, reports to goyellow_dispatch;
grant select, insert, update on weekly_summaries to goyellow_dispatch;

-- ===== upload_trip_points =====
create or replace function upload_trip_points(p_trip_token uuid, p_declared_bus text, p_points jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  r riders%rowtype;
  now_et time := (now() at time zone 'America/New_York')::time;
  in_window boolean;
  accepted int := 0;
  pt jsonb;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if jsonb_typeof(p_points) <> 'array' or jsonb_array_length(p_points) > 10 then raise exception 'bad request'; end if;
  select * into r from riders where id = auth.uid();
  if not found then raise exception 'no rider profile'; end if;
  in_window := (now_et between r.am_window_start and r.am_window_end) or (now_et between r.pm_window_start and r.pm_window_end);
  if not in_window then raise exception 'outside bus window'; end if;
  -- identity is not used past this line.

  if exists (select 1 from rate_limits where trip_token = p_trip_token and last_at > now() - interval '10 seconds') then
    raise exception 'rate limit';
  end if;
  insert into rate_limits(trip_token, last_at) values (p_trip_token, now())
  on conflict (trip_token) do update set last_at = excluded.last_at;

  for pt in select * from jsonb_array_elements(p_points) loop
    if abs((pt->>'lat')::float8) <= 90 and abs((pt->>'lon')::float8) <= 180 and coalesce((pt->>'p_bus')::real, 0) >= 0.7 then
      insert into trip_points(trip_token, t, geom, speed_mps, accuracy_m, p_bus, declared_bus)
      values (p_trip_token, (pt->>'t')::timestamptz, st_setsrid(st_makepoint((pt->>'lon')::float8, (pt->>'lat')::float8), 4326)::geography,
              (pt->>'speed')::real, (pt->>'acc')::real, (pt->>'p_bus')::real, left(coalesce(p_declared_bus, ''), 8));
      accepted := accepted + 1;
    end if;
  end loop;
  return accepted;
end $$;

-- ===== trip_progress: what the worker has published so far for a trip still in progress =====
-- (trip_ends is written only when a trip ENDS, and retention deletes the points of every token listed there, so in-flight
-- trips must not appear in it.)
create table if not exists trip_progress (
  trip_token uuid primary key,
  published boolean not null default false,
  max_riders int not null default 0,
  updated_at timestamptz not null default now()
);
alter table trip_progress enable row level security;
grant select, insert, update, delete on trip_progress to goyellow_worker;

-- ===== finish_trip: deletes that token's raw points and keeps only the receipt =====
create or replace function finish_trip(p_trip_token uuid) returns void
language plpgsql security definer set search_path = public as $$
declare prev trip_progress%rowtype;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into prev from trip_progress where trip_token = p_trip_token;
  perform end_trip(p_trip_token, coalesce(prev.published, false), coalesce(prev.max_riders, 0));
  delete from trip_progress where trip_token = p_trip_token;
end $$;

-- ===== trip_receipt =====
create or replace function trip_receipt(p_trip_token uuid)
returns table(published boolean, max_riders int, points_kept int)
language sql security definer set search_path = public stable as $$
  select coalesce((select e.published from trip_ends e where e.trip_token = p_trip_token), (select g.published from trip_progress g where g.trip_token = p_trip_token), false),
         coalesce((select e.max_riders from trip_ends e where e.trip_token = p_trip_token), (select g.max_riders from trip_progress g where g.trip_token = p_trip_token), 0),
         (select count(*)::int from trip_points p where p.trip_token = p_trip_token);
$$;

-- ===== retention (replaces 0002's): also clears stale in-progress rows =====
create or replace function run_retention() returns void language plpgsql security definer set search_path = public as $$
declare p int; tr int;
begin
  with d as (delete from trip_points tp
    where tp.t < now() - interval '6 hours' or exists (select 1 from trip_ends e where e.trip_token = tp.trip_token)
    returning 1) select count(*) into p from d;
  with d as (delete from bus_tracks where t < now() - interval '24 hours' returning 1) select count(*) into tr from d;
  delete from reports where t < now() - interval '30 days';
  delete from rate_limits where last_at < now() - interval '6 hours';
  delete from trip_progress where updated_at < now() - interval '6 hours';
  insert into retention_log(points_deleted, tracks_deleted) values (p, tr);
end $$;
revoke all on function run_retention() from public, anon, authenticated;

-- ===== reports (no user id is stored) =====
create or replace function submit_report(p_route text, p_stop text, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_kind not in ('no_show', 'early') or coalesce(p_route, '') = '' or coalesce(p_stop, '') = '' then raise exception 'bad request'; end if;
  insert into reports(route_label, stop_id, kind) values (left(p_route, 16), left(p_stop, 64), p_kind);
end $$;

create or replace function route_reports(p_route text, p_weeks int default 4)
returns table(kind text, t timestamptz)
language sql security definer set search_path = public stable as $$
  select r.kind, r.t from reports r
  where r.route_label = p_route and r.t >= now() - (least(greatest(p_weeks, 1), 8) * interval '7 days')
  order by r.t desc limit 1000;
$$;

-- ===== delete my account: removes the auth user; riders, followers and follows cascade =====
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ===== who can call what =====
revoke all on function upload_trip_points(uuid, text, jsonb), finish_trip(uuid), trip_receipt(uuid), submit_report(text, text, text),
                       route_reports(text, int), delete_my_account() from public, anon;
grant execute on function upload_trip_points(uuid, text, jsonb), finish_trip(uuid), trip_receipt(uuid), submit_report(text, text, text),
                          route_reports(text, int), delete_my_account() to authenticated;
