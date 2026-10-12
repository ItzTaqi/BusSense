import Foundation
import GoNCCore

/// Small English/Spanish string table (the home screens are English-only for now; these are the shared status strings).
public enum Language: String, Codable, CaseIterable, Sendable { case en, es
    public var name: String { self == .en ? "English" : "Español" }
}
public enum L10n {
    private static let table: [Language: [String: String]] = [
        .en: ["rider.sleeping": "Sleeping", "rider.listening": "Listening", "rider.paused": "Paused", "mode.rider": "Rider", "mode.parent": "Parent"],
        .es: ["rider.sleeping": "En reposo", "rider.listening": "Escuchando", "rider.paused": "En pausa", "mode.rider": "Pasajero", "mode.parent": "Padre/Madre"],
    ]
    public static func t(_ key: String, _ lang: Language = .en) -> String { table[lang]?[key] ?? table[.en]?[key] ?? key }
}

/// Alert and quiet-hours switches, saved on the phone and sent to the server with each followed bus.
public struct AlertPrefs: Codable, Equatable, Sendable {
    public var leaveNow = true, runningLate = true, notSeen = true, passed = true
    public var quietStart = "21:00", quietEnd = "06:30"
    public init() {}
    /// The shape stored in follows.alert_prefs (strings so it fits one jsonb column the worker already reads).
    public var serverPrefs: [String: String] {
        ["leave_now": String(leaveNow), "running_late": String(runningLate), "not_seen": String(notSeen), "passed": String(passed), "quiet_start": quietStart, "quiet_end": quietEnd]
    }
}

public enum DemoScenario {
    /// A bundled, clearly-labeled scripted scenario for the demo. NOT real data.
    public static let steps: [StatusRow] = [
        StatusRow(routeLabel: "DEMO-12", stopId: "demo-3", source: .noData),
        StatusRow(routeLabel: "DEMO-12", stopId: "demo-3", stopsAway: 6, etaMin: 14, etaLo: 11, etaHi: 17, source: .estimate),
        StatusRow(routeLabel: "DEMO-12", stopId: "demo-3", stopsAway: 4, etaMin: 9, etaLo: 7, etaHi: 11, source: .live),
        StatusRow(routeLabel: "DEMO-12", stopId: "demo-3", stopsAway: 2, etaMin: 5, etaLo: 4, etaHi: 7, source: .live),
        StatusRow(routeLabel: "DEMO-12", stopId: "demo-3", stopsAway: 1, etaMin: 2, etaLo: 1, etaHi: 3, source: .recent),
    ]
    public static let child = Child(id: "demo", name: "Demo", city: "Cary", school: "Demo High", districtCode: "67500", bus: "DEMO-12", stop: "demo-3", walkMin: 3)
}
