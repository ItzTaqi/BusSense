# GoNC

Prototype that shows families where a school bus is by detecting groups of 3+ opted-in rider phones moving together with a bus's
stop-and-go pattern. It publishes only an anonymous bus position and ETA, never an individual.

**Everything is written in Swift.** The only other file type is the Postgres schema (`supabase/migrations/*.sql`), which has no Swift form.

```
Package.swift
Sources/
  GoNCCore/     shared logic: districts, schools, times, insights, week-by-week, rides, alert rules, bus-vs-car classifier
  GoNCEngine/   companion detection, Kalman + Hungarian tracker, route learning, ETA, projection, trip simulator, worker loop, push dispatch
  GoNCUI/       the SwiftUI app: design system, screens, Supabase client (no SDK), trip service (location + motion), app state
  gonc-worker/  the server: clustering, push alerts (APNs), weekly AI summaries (Claude), Postgres via PostgresNIO
  gonc-sim/     simulator, adversarial evaluation, classifier training
  gonc-snap/    renders every screen to PNG headlessly (design review without a simulator)
Tests/          swift-testing suites for all of the above
Apps/iOS/       copy-paste iPhone app target (GoNCApp.swift) + Info.plist checklist
supabase/       SQL migrations, RLS, seed, privacy checks
design/ docs/   design system, architecture, privacy, district codes, AI usage
```

## Try it in 2 minutes (no accounts, no Xcode project)
Needs the Swift 5.10+ toolchain (Xcode or the command line tools).
```bash
swift test                              # all suites
swift run gonc-sim adversarial          # 50 randomized runs per adversarial scenario -> eval/out/adversarial.csv
swift run gonc-sim train                # classifier training on SYNTHETIC data (prints metrics that mean nothing about real rides)
swift run gonc-snap /tmp/gonc-snaps     # PNGs of every screen, light and dark
```

## Run the app on an iPhone
See [Apps/iOS/README.md](Apps/iOS/README.md): create an iOS App target, add this folder as a local package, link **GoNCUI**, copy `GoNCApp.swift`,
add the Info.plist keys and capabilities. **Settings > Demo** plays a scripted scenario with no backend.

## Backend (Supabase)
1. Create a free project. Auth > enable **Anonymous sign-ins**.
2. SQL editor: run `supabase/migrations/0001` to `0005` in order, then `seed.sql`. Set real passwords for roles `goyellow_worker` and `goyellow_dispatch`.
3. Run `supabase/tests/privacy_checks.sql` and `retention_test.sql`; the privacy queries must return no rows.
4. Run the worker: `cp .env.example .env`, fill it in, then `export $(cat .env | xargs) && swift run gonc-worker`.

## Honest status (read before relying on any number)
* The app **compiles and its logic is tested on macOS**, and its screens were rendered headlessly. **It has not been run on an iPhone or in the simulator**,
  and the iOS-only code (background location, motion, `Apps/iOS/GoNCApp.swift`) has not been compiled here because this Mac has no iOS SDK. Expect to fix small things on first build in Xcode.
* **Nothing has run against a live Supabase project**: the SQL migrations, the worker's Postgres queries, APNs and the Claude call are written but untested end to end.
* The bundled classifier (`ClassifierModelData.swift`) is a **synthetic placeholder**. There is no in-app recording tool any more, so collect labeled bus/car/walk
  recordings another way and retrain with `gonc-sim train`. Adversarial results are on **simulated** traces. Real-ride accuracy, ETA error, time-to-LIVE and battery are not measured.
* ETA scaling (`delta`) is fixed at 1.0 until today's elapsed time is tracked; the `ESTIMATE` source (no live track) and OSRM map matching are not implemented.
  Public positions are rounded to 50 m, but the planned 15 s delay and snapping to the route line are not built.
* Push alerts: only "Leave now" is wired in the dispatcher (the other rules exist and are tested). Alerts need an Apple Developer account and the Push Notifications capability.
* School lists come from OpenStreetMap (incomplete, public + private mixed). District codes are Here Comes the Bus codes from district pages (`docs/DISTRICT_CODES.md`); verify each. The app does not integrate with Here Comes the Bus.
* The on-screen "community supplement" footer was removed at the owner's request; the disclaimer is in the Terms (section 10) and must be agreed to on first use.
  The original brief asked for it on every screen, so revisit this if the competition requires it.
* Almost all code was written by Claude (see `docs/AI_USAGE.md`). If you enter this in the Congressional App Challenge, follow its authorship and disclosure rules.
