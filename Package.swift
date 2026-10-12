// swift-tools-version:5.10
import PackageDescription

// GoNC is written in Swift end to end. The only non-Swift file type is the SQL schema in supabase/migrations.
//   GoNCCore   shared logic: data, times, insights, classifier. No UI. Used by the app and the worker.
//   GoNCEngine clustering, tracking, route learning, ETA and the simulator (used by the worker and tests).
//   GoNCUI     the SwiftUI app: screens, design system, services. Drop it into any iOS app target.
//   gonc-worker  the server-side worker (companions -> tracks -> bus status, alerts, weekly AI summaries).
//   gonc-sim     trip simulator, adversarial evaluation and classifier training.
let package = Package(
    name: "GoNC",
    platforms: [.macOS(.v14), .iOS(.v17)],
    products: [
        .library(name: "GoNCCore", targets: ["GoNCCore"]),
        .library(name: "GoNCEngine", targets: ["GoNCEngine"]),
        .library(name: "GoNCUI", targets: ["GoNCUI"]),
        .executable(name: "gonc-worker", targets: ["gonc-worker"]),
        .executable(name: "gonc-sim", targets: ["gonc-sim"]),
        .executable(name: "gonc-snap", targets: ["gonc-snap"]),
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/postgres-nio.git", from: "1.21.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.5.0"),
        .package(url: "https://github.com/apple/swift-crypto.git", from: "3.0.0"),
        .package(url: "https://github.com/apple/swift-nio-ssl.git", from: "2.25.0"),
    ],
    targets: [
        .target(name: "GoNCCore"),
        .target(name: "GoNCEngine", dependencies: ["GoNCCore"]),
        .target(name: "GoNCUI", dependencies: ["GoNCCore"], resources: [.copy("Resources/Fonts")]),
        .executableTarget(name: "gonc-worker", dependencies: [
            "GoNCCore", "GoNCEngine",
            .product(name: "PostgresNIO", package: "postgres-nio"), .product(name: "Logging", package: "swift-log"),
            .product(name: "Crypto", package: "swift-crypto"), .product(name: "NIOSSL", package: "swift-nio-ssl"),
        ]),
        .executableTarget(name: "gonc-sim", dependencies: ["GoNCCore", "GoNCEngine"]),
        .executableTarget(name: "gonc-snap", dependencies: ["GoNCCore", "GoNCUI"]),
        .testTarget(name: "GoNCUITests", dependencies: ["GoNCUI", "GoNCCore"]),
        .testTarget(name: "GoNCEngineTests", dependencies: ["GoNCEngine"]),
        .testTarget(name: "GoNCCoreTests", dependencies: ["GoNCCore"], resources: [.copy("Resources/vectors.json")]),
    ]
)
