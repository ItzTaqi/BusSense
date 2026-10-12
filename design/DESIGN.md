# GoNC design system

**Feel:** minimal, white with a blue accent. Everything is centered.
Source of truth in code: `app/src/theme.ts` and `app/src/components/Ui.tsx`.

## Color (white + blue)
| Token | Light | Dark | Use |
|---|---|---|---|
| bg / card | `#FFFFFF` | `#0B1430` / `#111D42` | surfaces (white is the main color) |
| cardAlt | `#F1F6FF` | `#1A2547` | tinted panels |
| ink / sub | `#0B1220` / `#5B6B8C` | `#F2F6FF` / `#9DB0DC` | text |
| line | `#DCE6F7` | `#26335C` | borders |
| brand (accent) | `#0F46E6` | `#6B96FF` | primary button, selected tab, logo, progress |
| hero | `#1F6BFF` to `#0B3FBF` | `#1747B8` to `#0B2A73` | blue gradient cards (content always white) |
| danger | `#C62145` | `#FF7B94` | "Bus didn't come", delete (the only other hue) |

## Rules
1. **Status is never color alone.** Source badge = icon + text + fill style:
   LIVE solid fill + pulsing dot, RECENT outline + clock, ESTIMATE dashed outline + analytics icon, NO DATA faint fill + help icon.
2. **Touch targets** at least 48 pt (fields, buttons, tabs). Body text 16 pt, scales with system text size.
3. **Motion:** one pulse (LIVE dot), off when the system "Reduce Motion" setting is on.
4. **Layout:** all text, titles, cards and heroes are center-aligned. Form rows in Alerts keep label left, switch right.
5. **No footer.** The "not the official tracker" disclaimer lives in the Privacy and Terms (section 10), which everyone must agree to after "Get started".
6. **Light / dark:** Settings > Appearance offers System (default, follows the phone), Light and Dark. The choice is saved on the phone. `app.json` uses `userInterfaceStyle: automatic` so iOS and Android pass the device setting through.

## Type scale
hero 56 (ETA) · title 22 · body 16 · label 13 · tab 11.

## Components
Screen, Hero, Card (icon + title), Input (soft filled field, blue focus ring), Btn (primary solid blue / soft / danger), Badge, PulseDot, IconBubble,
ProgressBar, RouteTrack (bus, stops, home), TabBar. Icons: Ionicons (`@expo/vector-icons`).

Preview the palette: open `design/palette.html`.

## Navigation (role-based)
The first screen picks the role; the app then shows only that role's tabs, with no role switcher.
- Rider: Ride, Settings.
- Parent: Today, Weekly report, Settings.
- Settings holds Notifications (parents: permission, the four alert switches, quiet hours), Privacy and Terms, Language, Demo, and (riders only) Trip receipt and Record data. The demo is a sample stop board
  opened from Settings with an "Exit demo" bar; it never appears on the first screen.

## Contrast
Light: ink `#050A1A`, secondary `#3B4766`, accent `#0F46E6` (white on accent about 6.6:1). Dark: white text, accent `#6B96FF`.
Cards are flat with a 1 px border, no shadows.

## First screens
Welcome: full-bleed blue gradient, the name "GoNC" in Plus Jakarta Sans (home page only), a white "Powered by riders · Just for riders"
pill, both centered, and one white "Get started" button at the bottom. Then a role screen (rider / parent).
Report buttons ("Bus didn't come", "Bus came early") sit side by side when there is room, stack on narrow screens,
and show Sending, Sent (locked 60 s) or a retry message.

## Parent flow
Role screen -> six short setup screens (welcome, child nickname, school, district + bus number, stop + walking time, alerts) -> parent interface.
Today = date, "<child>'s bus", status card (source badge, ETA, range, route track), a "Leave in about N min" card, and the report buttons.
Several children are supported: chips switch the active child; add or remove them in Settings. Children are kept on the parent's phone only
(SecureStore on a device; localStorage in the browser preview). Child names are nicknames and are never sent to the server.

## Report a problem
One quiet "Report a problem" button on Today. Tapping it expands into "Bus didn't come" and "Bus came early" (side by side when there is
room). Sending collapses it back and shows "Thanks, report sent"; each choice locks for 60 s to prevent double reports.

## Bottom bar and safe areas
The tab bar owns the bottom safe-area inset (home indicator) on screens that have one; the Welcome screen and the other tab-less screens add the
inset themselves, once. The top inset is applied once, in the header bar. Dark mode uses a deep navy background, never near-black.

## Terms agreement
Welcome -> "Get started" -> Privacy and Terms with a checkbox ("I have read and agree") and "Agree and continue" (disabled until ticked)
-> role screen. Acceptance is saved on the phone with a terms version (`app/src/lib/terms.ts`); changing the version asks everyone again.
Anyone already set up who has not agreed is asked before the app opens.

## Rider setup
Name or nickname (stays on the phone) -> birthday -> bus -> bus times -> location -> motion. Every step has a back arrow; on the first step it
returns to the home page. The rider home mirrors the parent's Today: date and "<name>'s bus".

## Delete account
Settings > Privacy and Terms > "Delete my account" opens an in-app confirmation (system alerts do not show in the browser preview): what will be
deleted, what stays (location points are not linked to the account; anonymous reports and timing data), and what to know first. The red
"Delete everything" button stays off until "I understand this cannot be undone" is ticked. The server is asked first (`delete-account` function);
only when it confirms are the profile's local copies erased (all `gonc.*` keys, listed in `app/src/lib/localKeys.ts`) and the app returns to the
home page. If the server can't be reached, nothing is deleted and the button becomes "Try again".
