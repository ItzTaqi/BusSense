# District codes (Here Comes the Bus)

What the research found (October 2026):

- Each NC district that uses Here Comes the Bus (Synovia) has its **own district code**, set by the district. Families sign up with
  the code plus a student ID. The code identifies the district's tracking system; it does **not** identify a bus,
  so the app still asks for a bus number separately.
- No statewide list exists. The codes in `app/src/data/districts.ts` come from district/vendor pages. **Verify each with the
  district's transportation office before relying on it.**

| District | Code | Source |
|---|---|---|
| Wake County, yellow bus | 67500 | https://www.wcpss.net/Page/35380 |
| Wake County, vendor bus | 67501 | https://www.wcpss.net/Page/35380 |
| Charlotte-Mecklenburg | 73877 | https://www.govtech.com/education/k-12/charlotte-mecklenburg-schools-use-app-to-track-buses (via search summary) |
| Johnston County | 76361 | https://www.johnston.k12.nc.us/o/tes/page/transportation-information |
| Granville County | 82346 | https://www.gcs.k12.nc.us/transportation |
| Bladen County | 75971 | https://blp.bladen.k12.nc.us/students-families/here-comes-the-bus |
| Wilson County | 13509 | https://www.wilsonschoolsnc.net/departments/transportation-services/here-comes-the-bus-app |

How GoYellow uses the code: as a district identifier only, stored on the rider's account row (`riders.district_code`).
GoYellow does **not** connect to Here Comes the Bus or read the buses' own GPS hardware. Doing that would need an agreement
with the district and the vendor. Not done, not assumed.

Other tracking vendors seen in NC: Edulog (New Hanover). Districts not on the list use "My district isn't listed" and type a 5-digit code.
