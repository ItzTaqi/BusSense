# GoYellow design system

**Feel:** minimal, high-contrast, black and white. Everything is centered.
Source of truth in code: `app/src/theme.ts` and `app/src/components/Ui.tsx`.

## Color (monochrome)
| Token | Light | Dark | Use |
|---|---|---|---|
| bg | `#FFFFFF` | `#000000` | screen background |
| card / cardAlt | `#FFFFFF` / `#F2F2F2` | `#121212` / `#1E1E1E` | surfaces |
| ink | `#000000` | `#FFFFFF` | text, icons, selected states |
| sub | `#5A5A5A` | `#A8A8A8` | secondary text |
| line | `#D9D9D9` | `#2E2E2E` | borders |
| brand / onBrand | `#000000` / `#FFFFFF` | `#FFFFFF` / `#000000` | primary button, selected tab, logo |
| hero | `#000000` to `#3A3A3A` | `#1A1A1A` to `#3D3D3D` | dark gradient cards (content always white) |
| danger | `#B00020` | `#FF6B81` | "Bus didn't come", delete (the only hue) |

## Rules
1. **Status is never color.** Source badge = icon + text + fill style:
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
