# Privacy

Non-negotiables (enforced in code and tests): k >= 3 to publish; no user id in location data;
account and location tables never joined; raw points deleted at trip end (6 h hard cap);
public view delayed 15 s, snapped, rounded to 50 m; under-13 cannot enable sensing; no ads or analytics.

## Dev data (M0 logging build)
`dev_labeled_trips` holds raw labeled GPS/accelerometer from consenting teammates (13+, with guardian OK)
for training/evaluation only. It is dropped after evaluation. Not part of the production schema.
