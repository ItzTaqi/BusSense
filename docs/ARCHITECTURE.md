# Architecture
Phone (rider) --5 s GPS+accel--> on-phone classifier (P(bus)>=0.7) --15 s batches--> `trip-points` edge fn
  (checks rider's bus window with the user's JWT, then drops identity; rate limit by trip_token)
  --> `trip_points` (no user id) --> worker every 15 s:
  resample 5 s grid -> KD-tree pairs <200 m -> companions (<=40 m for 80% AND matching stops) -> networkx components
  >= K_MIN(3) -> Kalman tracks + Hungarian association -> label vote -> `bus_tracks` (rounded 50 m)
  and `bus_status` per stop (stops away, ETA range) --> Supabase Realtime --> Parent stop board.
`end_trip()` and `run_retention()` (pg_cron every 10 min) delete raw points; only receipts remain.
Account tables and location tables are never joined; the worker DB role has no grants on account tables.

Decisions worth knowing
* A window with zero detected stops can never produce a bus (cars/walkers). Stop detection uses smoothed speed < 2 m/s.
* Stop matching is measured against the shorter stop list, so one phone missing a stop (GPS noise) does not veto a bus.
* Known limits: a long stretch with no stops can cause a missed bus (false negative, never a false bus).
