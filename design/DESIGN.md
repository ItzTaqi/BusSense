# GoYellow design system

**Feel:** minimal, white with a blue accent. Everything is centered.
Source of truth in code: `app/src/theme.ts` and `app/src/components/Ui.tsx`.

## Color (white + blue)
| Token | Light | Dark | Use |
|---|---|---|---|
| bg / card | `#FFFFFF` | `#0A1020` / `#121A33` | surfaces (white is the main color) |
| cardAlt | `#F1F6FF` | `#1A2547` | tinted panels |
| ink / sub | `#0B1220` / `#5B6B8C` | `#F2F6FF` / `#9DB0DC` | text |
| line | `#DCE6F7` | `#26335C` | borders |
| brand (accent) | `#1F6BFF` | `#4D8DFF` | primary button, selected tab, logo, progress |
| hero | `#1F6BFF` to `#0B3FBF` | `#1747B8` to `#0B2A73` | blue gradient cards (content always white) |
| danger | `#C62145` | `#FF7B94` | "Bus didn't come", delete (the only other hue) |

## Rules
1. **Status is never color alone.** Source badge = icon + text + fill style:
   LIVE solid fill + pulsing dot, RECENT outline + clock, ESTIMATE dashed outline + analytics icon, NO DATA faint fill + help icon.
2. **Touch targets** at least 56 pt (buttons) and 52 pt (tabs). Body text 18 pt, scales with system text size.
3. **Motion:** one pulse (LIVE dot), off when the system "Reduce Motion" setting is on.
4. **Layout:** all text, titles, cards and heroes are center-aligned. Form rows in Alerts keep label left, switch right.
5. **Footer** "Community supplement – not the official WCPSS tracker." on every screen except the minimal home page.
6. **Dark mode** follows the phone setting.

## Type scale
hero 72 (ETA) · title 28 · body 18 · label 16 · tab 12.

## Components
Screen, Hero, Card (icon + title), Btn (primary solid / outline / danger), Badge, PulseDot, IconBubble,
ProgressBar, RouteTrack (bus, stops, home), TabBar. Icons: Ionicons (`@expo/vector-icons`).

Preview the palette: open `design/palette.html`.
