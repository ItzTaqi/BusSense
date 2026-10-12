# Architecture

```
iPhone (GoNCUI)                       Supabase                           Worker (gonc-worker, Swift)
  location + motion (5 s)               Auth: anonymous sign-in            clustering  (role goyellow_worker)
  -> classifier ON the phone            PostgREST + SQL functions            trip_points -> companions -> Kalman/Hungarian tracks
     (P(bus) >= 0.7 or no upload)         upload_trip_points                 -> bus_tracks (rounded 50 m) + bus_status
  -> batches every 15 s ----------------> checks the rider's bus window,     dispatching (role goyellow_dispatch)
                                            drops identity, rate-limits       bus_status changes -> alert rules -> APNs push
  parents poll bus_status (15 s) <------- bus_status (RLS: followed routes)   weekly summaries: report counts -> Claude -> weekly_summaries
  ReportButton -> submit_report          reports (no user id)
  delete account -> delete_my_account    pg_cron run_retention every 10 min: points deleted at trip end, 6 h hard cap
```

Key decisions
* **One language.** `GoNCCore` has no UI and no I/O, so the same code runs in the app, the worker and the tests.
* **Two database roles.** The clustering worker sees only anonymous location data. A separate dispatcher role reads follows (bus, stop, walk minutes, push token) and reports. Neither can read `riders`.
* **No SDKs.** The Supabase client is ~150 lines of URLSession. The AI key never leaves the server; the app only reads finished summaries.
* **A window with zero detected stops can never produce a bus** (cars and walkers). Stop detection uses smoothed speed < 2 m/s. Stop matching is measured against the shorter stop list so one phone missing a stop does not veto a bus.
* **k >= 3** is `EngineConfig.kMin`, a plain constant, and `WorkerLoop` re-checks it at the publish boundary.
* Known limits: a long stretch with no stops can cause a missed bus (a false negative, never a false bus).
