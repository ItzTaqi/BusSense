GoNC

App Prototype that shows families where a school bus is by detecting groups of 3+ opted-in rider phones
moving together with a bus's stop-and-go pattern. Publishes only an anonymous bus position and ETA.

```
app/        Expo (React Native, TS) – Rider + Parent modes        sim/   trip simulator + adversarial scenarios
supabase/   migrations, RLS, edge functions, SQL tests, seed      eval/  metric scripts (CSV/PNG into eval/out/)
worker/     companions, tracker, route learning, ETA, pipeline    docs/  ARCHITECTURE, PRIVACY, AI_USAGE
```

