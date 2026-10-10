# GoYellow
> Community supplement – not the official WCPSS tracker.

Prototype that shows families where a school bus is by detecting groups of 3+ opted-in rider phones
moving together with a bus's stop-and-go pattern. Publishes only an anonymous bus position and ETA.

```
app/        Expo (React Native, TS) – Rider + Parent modes        sim/   trip simulator + adversarial scenarios
supabase/   migrations, RLS, edge functions, SQL tests, seed      eval/  metric scripts (CSV/PNG into eval/out/)
worker/     companions, tracker, route learning, ETA, pipeline    docs/  ARCHITECTURE, PRIVACY, AI_USAGE
```

## Run the tests (no accounts needed)
```bash
python3 -m venv .venv && .venv/bin/pip install pytest ruff numpy scipy networkx scikit-learn shapely pyproj matplotlib "psycopg[binary]"
.venv/bin/pytest worker                      # 30 tests: companions (k>=3), tracker, route learning, ETA, pipeline
cd app && npm install && npm test            # 39 tests: TS classifier matches Python vectors, alert rules, windows
```

## Run the app on an iPhone (Xcode required)
1. Install Xcode (App Store), open it once, accept the license.
2. Create a free Supabase project; run `supabase/migrations/0001*.sql`, `0002*.sql`, then `seed.sql`
   in the SQL editor. Enable Anonymous sign-ins (Auth settings). Deploy the functions in `supabase/functions/`.
3. `cp .env.example app/.env` and fill in the URL and anon key.
4. `cd app && npm install && npx expo run:ios --device` (dev build; background location needs it, not Expo Go).
5. **Demo mode** needs no backend: tap "Demo mode" in the app to play a labeled scripted scenario.

## Run the worker locally
`cd worker && WORKER_DATABASE_URL=postgresql://goyellow_worker:...@HOST:5432/postgres python main.py`
(Set the `goyellow_worker` password in Supabase first; migration 0001 ships a placeholder.)

## Simulate and evaluate
```bash
PYTHONPATH=.:worker .venv/bin/python -m eval.adversarial   # false-bus counts over 50 runs/scenario (simulated)
PYTHONPATH=worker .venv/bin/python -m classifier.make_synthetic   # SYNTHETIC data only
```

## Honest status
* The bundled classifier `app/src/classifier/model.json` is a **synthetic placeholder** (`synthetic_placeholder: true`).
  Its metrics mean nothing. Record real bus/car/walk trips with the in-app logging build, then retrain with
  `worker/classifier/train.py`, regenerate vectors with `make_vectors.py`.
* Adversarial results are on **simulated** traces. Real-ride accuracy, ETA error, time-to-LIVE, position error
  and battery numbers are not measured yet; scripts for those are TODO in `eval/`.
* Worker `ESTIMATE` source (no live track) and OSRM map matching are not implemented; the worker only publishes LIVE/RECENT.
* Nothing here has been run against a live Supabase project or on a device yet.
