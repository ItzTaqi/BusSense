# Running GoNC on an iPhone

1. Xcode: **File > New > Project > iOS > App** (Interface: SwiftUI, Language: Swift). Delete the template `ContentView.swift` and `...App.swift`.
2. **File > Add Package Dependencies > Add Local...** and choose this repository's folder. Link the **GoNCUI** product to your app target.
3. Copy `GoNCApp.swift` from this folder into the app target.
4. In the target's **Info** tab add these keys:

   | Key | Value |
   |---|---|
   | `GONC_SUPABASE_URL` | your project URL, e.g. `https://abcd.supabase.co` |
   | `GONC_SUPABASE_ANON_KEY` | the project's anon (public) key |
   | `NSLocationWhenInUseUsageDescription` | GoNC listens to your location only during your bus times to help show where your bus is. It uses a random trip code, not your name. |
   | `NSLocationAlwaysAndWhenInUseUsageDescription` | GoNC needs background location during your bus times so trips are detected while your phone is locked. |
   | `NSMotionUsageDescription` | Motion sensors help tell a bus from a car. |
   | `UIBackgroundModes` | `location`, `remote-notification` |

5. **Signing & Capabilities**: pick your team, then add **Background Modes** (Location updates, Remote notifications) and **Push Notifications**.
6. Run on a device (background location and push need a real iPhone).

Without the two `GONC_SUPABASE_*` keys the app still runs: it shows honest "couldn't reach the server" states, and **Settings > Demo** plays the scripted scenario.
