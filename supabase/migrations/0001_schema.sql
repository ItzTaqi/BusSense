-- GoYellow schema. RLS on every table. Location tables never reference account tables.
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ===== ACCOUNT SIDE (never holds location) =====
create table riders (
  id uuid primary key references auth.users on delete cascade,
  birth_year int not null,
  school_id text not null,
  declared_bus text,
  am_stop_id text, pm_stop_id text,
  am_window_start time, am_window_end time,
  pm_window_start time, pm_window_end time,
  created_at timestamptz not null default now()
);
create table followers (
  id uuid primary key references auth.users on delete cascade,
  push_token text,
  walk_min int not null default 3,
  language text not null default 'en'
);
create table follows (
  follower_id uuid not null references followers on delete cascade,
  route_label text not null,
  stop_id text not null,
  nickname text,
  alert_prefs jsonb not null default '{}',
  primary key (follower_id, route_label, stop_id)
);

-- ===== LOCATION SIDE (no user id anywhere) =====
create table trip_points (
  trip_token uuid not null,
  t timestamptz not null,
  geom geography(point, 4326) not null,
  speed_mps real, accuracy_m real, p_bus real, declared_bus text
) partition by range (t);
create table trip_points_default partition of trip_points default; -- TODO: hourly partitions via cron
create index on trip_points (trip_token, t);

create table trip_ends (trip_token uuid primary key, ended_at timestamptz not null default now(),
  published boolean not null default false, max_riders int not null default 0);

create table routes (
  route_label text primary key, school_id text,
  shape geography(linestring, 4326), n_trips_learned int not null default 0
);
create table stops (
  stop_id text primary key, route_label text not null references routes,
  seq int not null, geom geography(point, 4326) not null, saved_by_count int not null default 0
);
create table bus_tracks (
  track_id uuid not null default gen_random_uuid(), route_label text,
  is_substitute_guess boolean not null default false, t timestamptz not null,
  centroid_geom geography(point, 4326) not null, n_riders int not null check (n_riders >= 3),
  source text not null check (source in ('live','recent'))
);
create table bus_status (
  route_label text not null, stop_id text not null, stops_away int,
  eta_min real, eta_lo real, eta_hi real,
  source text not null check (source in ('LIVE','RECENT','ESTIMATE','NO_DATA')),
  updated_at timestamptz not null default now(),
  primary key (route_label, stop_id)
);
create table segment_times (
  route_label text not null, from_seq int not null, to_seq int not null,
  weekday int not null, tod_bucket_15min int not null, seconds real not null
);
create table reports (
  route_label text not null, stop_id text not null,
  kind text not null check (kind in ('no_show','early')), t timestamptz not null default now()
);
create table retention_log (
  ran_at timestamptz not null default now(), points_deleted int, tracks_deleted int
);

-- ===== DEV ONLY: raw labeled recordings for classifier training. Dropped after evaluation. =====
create table dev_labeled_trips (
  id bigint generated always as identity primary key,
  trip_token uuid not null, label text not null check (label in ('bus','car','walk')),
  t timestamptz not null, lat double precision not null, lon double precision not null,
  speed_mps real, accuracy_m real, ax real, ay real, az real
);

-- ===== RLS =====
alter table riders enable row level security;
alter table followers enable row level security;
alter table follows enable row level security;
alter table trip_points enable row level security;
alter table trip_ends enable row level security;
alter table routes enable row level security;
alter table stops enable row level security;
alter table bus_tracks enable row level security;
alter table bus_status enable row level security;
alter table segment_times enable row level security;
alter table reports enable row level security;
alter table retention_log enable row level security;
alter table dev_labeled_trips enable row level security;

create policy riders_own on riders for all using (id = auth.uid()) with check (id = auth.uid());
create policy followers_own on followers for all using (id = auth.uid()) with check (id = auth.uid());
create policy follows_own on follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());
create policy routes_read on routes for select to authenticated using (true);
create policy stops_read on stops for select to authenticated using (true);
-- Parents see status only for routes they follow.
create policy status_followed on bus_status for select to authenticated using (
  exists (select 1 from follows f where f.follower_id = auth.uid()
          and f.route_label = bus_status.route_label and f.stop_id = bus_status.stop_id));
create policy reports_insert on reports for insert to authenticated with check (true);
-- Dev recordings: insert-only from the app; nobody can read back through the API.
create policy dev_insert on dev_labeled_trips for insert to authenticated with check (true);
-- trip_points, trip_ends, bus_tracks, segment_times, retention_log: no client policies.
-- Only edge functions (service role) and the worker role touch them.

-- ===== WORKER ROLE: can read location data, cannot read account tables =====
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'goyellow_worker') then
    create role goyellow_worker login password 'CHANGE_ME_IN_DASHBOARD' bypassrls;
  end if;
end $$;
revoke all on riders, followers, follows from goyellow_worker;
grant usage on schema public to goyellow_worker;
grant select, delete on trip_points to goyellow_worker;
grant select on routes, stops to goyellow_worker;
grant select, insert, update, delete on bus_tracks, bus_status, segment_times, retention_log to goyellow_worker;
grant select, update on trip_ends to goyellow_worker;
