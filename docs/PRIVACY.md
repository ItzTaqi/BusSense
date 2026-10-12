# Privacy

Non-negotiables (enforced in code and tests): k >= 3 to publish; no user id in location data;
account and location tables never joined; raw points deleted at trip end (6 h hard cap);
public view delayed 15 s, snapped, rounded to 50 m; under-13 cannot enable sensing; no ads or analytics.

## Dev data (M0 logging build)
`dev_labeled_trips` holds raw labeled GPS/accelerometer from consenting teammates (13+, with guardian OK)
for training/evaluation only. It is dropped after evaluation. Not part of the production schema.

## AI weekly report
Once a week the worker writes a two-sentence summary per route from **aggregate counts only** (totals of "didn't come" / "came early" reports, this week vs last week,
busiest weekday) using the Claude API. No names, IDs, locations or free text are sent, and the API key lives only on the server. Parents just read the finished summary.
Not yet tested against the live API.

## Database roles
`goyellow_worker` reads and writes anonymous location data only. `goyellow_dispatch` reads follows/followers (bus, stop, walk minutes, push token, alert preferences),
bus_status and reports, and writes weekly summaries. Neither role can read `riders` (birth year, student ID, school). `supabase/tests/privacy_checks.sql` verifies this.
