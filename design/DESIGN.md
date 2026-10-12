# GoYellow design system

**Feel:** friendly, bright, trustworthy. Minimal home page, vibrant data screens.
Source of truth in code: `app/src/theme.ts` and `app/src/components/Ui.tsx`.

## Color
| Token | Light | Dark | Use |
|---|---|---|---|
| sun | `#FFD60A` | same | brand, primary buttons, selected tab |
| navy | `#0B1B3F` | `#14275C` hero | ink, hero gradient start |
| blue | `#2E6BFF` | `#5C8DFF` | links, icons, hero gradient end |
| violet | `#8B5CF6` | `#6D3FF0` | ESTIMATE badge, dark hero end |
| mint | `#14D6A0` | same | LIVE badge, "your stop" |
| amber | `#FF9F1C` | same | RECENT badge |
| coral/danger | `#D6234A` | `#FF7B94` | "Bus didn't come", delete |
| bg / card | `#F4F7FF` / `#FFFFFF` | `#070F26` / `#101D44` | surfaces |

## Rules
1. **Status is never color alone.** Source badge = color + icon + text: LIVE (pulsing dot), RECENT (clock),
   ESTIMATE (analytics), NO DATA (help). Route track states "N stops away" in text.
2. **Touch targets** are at least 56 pt (buttons) and 52 pt (tabs). Body text is 18 pt and scales with system text size.
3. **Motion** is one pulse (LIVE dot). It stops when the system "Reduce Motion" setting is on.
4. **Contrast:** navy on sun, white on navy/blue/violet gradients. Re-check if you change a token.
5. **Footer** "Community supplement – not the official WCPSS tracker." appears on every screen.
6. **Dark mode** follows the phone setting. No in-app toggle.

## Type scale
hero 72 (ETA number) · title 28 · body 18 · label 16 · tab 12.

## Components
Screen, Hero (gradient + watermark icon), Card (optional icon + title), Btn (primary gradient / outline / danger),
Badge, PulseDot, IconBubble, ProgressBar (onboarding), RouteTrack (bus → stops → home), TabBar (4 rider / 3 parent tabs).
Icons: Ionicons via `@expo/vector-icons`.

## Screens
Welcome (minimal) → Onboarding (5 steps) → Rider: Ride · Receipt · Record · Privacy.
Parent: Stop board (hero ETA + range + route track + leave-by) · Alerts · Report card.
Open `design/palette.html` in a browser to see the palette.
