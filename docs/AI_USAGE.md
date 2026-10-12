# AI Usage Disclosure

**Almost all code in this repository was written by Claude (Anthropic) at the owner's request,
including the [CORE] algorithm modules.** This was built as a prototype with the owner's instruction that the
Congressional App Challenge student-authorship rule not apply to it. **If any of this code is entered in the
Challenge, the team must follow that competition's rules and disclose accurately** – rewrite the [CORE] modules
below themselves, or disclose them as AI-written.

[CORE] modules written by AI (all Swift): `Sources/GoNCEngine/Companions.swift`, `Tracker.swift` (Kalman filter + Hungarian algorithm),
`RouteLearning.swift` (route learning + ETA), `Pipeline.swift`, `ClassifierTraining.swift`, `Sources/GoNCCore/Classifier/*`.
Also AI-written: everything else (the SwiftUI app, the Supabase client, the worker, the SQL migrations, the simulator, the docs, CI).
The code was first written in TypeScript and Python and then ported to Swift with the shared test vectors (the Swift classifier matches the Python output on 12 vectors,
and the Swift map projection matches pyproj to a hundredth of a metre).
Tests passing do not mean the algorithms are validated on real rides (see README "Honest status").
