import Foundation
import GoNCCore

public struct TripReceipt: Equatable, Codable, Sendable {
    public var published: Bool
    public var maxRiders: Int
    public var pointsKept: Int
    enum CodingKeys: String, CodingKey { case published, maxRiders = "max_riders", pointsKept = "points_kept" }
}

/// One uploaded location point. Carries a random trip code and NO user id.
public struct TripPoint: Codable, Equatable, Sendable {
    public var t: Date, lat: Double, lon: Double, speed: Double, acc: Double, pBus: Double
    public init(t: Date, lat: Double, lon: Double, speed: Double, acc: Double, pBus: Double) { self.t = t; self.lat = lat; self.lon = lon; self.speed = speed; self.acc = acc; self.pBus = pBus }
    enum CodingKeys: String, CodingKey { case t, lat, lon, speed, acc, pBus = "p_bus" }
}

public struct RiderProfile: Codable, Equatable, Sendable {
    public var birthYear: Int, schoolId: String, declaredBus: String, districtCode: String, studentId: String
    public var usualPickupTime: String, schoolDismissalTime: String
    public var amWindowStart: String, amWindowEnd: String, pmWindowStart: String, pmWindowEnd: String
    public init(birthYear: Int, schoolId: String, declaredBus: String, districtCode: String, studentId: String, usualPickupTime: String, schoolDismissalTime: String, windows: Times.Windows) {
        self.birthYear = birthYear; self.schoolId = schoolId; self.declaredBus = declaredBus; self.districtCode = districtCode; self.studentId = studentId
        self.usualPickupTime = usualPickupTime; self.schoolDismissalTime = schoolDismissalTime
        amWindowStart = windows.amStart; amWindowEnd = windows.amEnd; pmWindowStart = windows.pmStart; pmWindowEnd = windows.pmEnd
    }
    enum CodingKeys: String, CodingKey {
        case birthYear = "birth_year", schoolId = "school_id", declaredBus = "declared_bus", districtCode = "district_code", studentId = "student_id"
        case usualPickupTime = "usual_pickup_time", schoolDismissalTime = "school_dismissal_time"
        case amWindowStart = "am_window_start", amWindowEnd = "am_window_end", pmWindowStart = "pm_window_start", pmWindowEnd = "pm_window_end"
    }
}

/// Everything the screens need from the server. Real calls go to Supabase (SQL functions + tables); `OfflineBackend` is used
/// when nothing is configured, so the app still runs and shows honest "couldn't reach the server" states.
public protocol BackendAPI: Sendable {
    func upsertRider(_ profile: RiderProfile) async throws
    func followBus(route: String, stop: String, walkMin: Int, prefs: [String: String]) async throws
    func submitReport(route: String, stop: String, kind: Report.Kind) async throws
    func routeReports(route: String, weeks: Int) async throws -> [Report]
    func weeklySummary(route: String) async throws -> String?
    func uploadTripPoints(token: String, declaredBus: String, points: [TripPoint]) async throws -> Int
    func finishTrip(token: String) async throws
    func tripReceipt(token: String) async throws -> TripReceipt
    func busStatus(route: String) async throws -> [StatusRow]
    func deleteMyAccount() async throws
}

public struct BackendError: Error, Equatable, Sendable { public var message: String; public init(_ m: String) { message = m } }

public struct OfflineBackend: BackendAPI {
    public init() {}
    private func fail() throws -> Never { throw BackendError("No server configured") }
    public func upsertRider(_ profile: RiderProfile) async throws { try fail() }
    public func followBus(route: String, stop: String, walkMin: Int, prefs: [String: String]) async throws { try fail() }
    public func submitReport(route: String, stop: String, kind: Report.Kind) async throws { try fail() }
    public func routeReports(route: String, weeks: Int) async throws -> [Report] { try fail() }
    public func weeklySummary(route: String) async throws -> String? { try fail() }
    public func uploadTripPoints(token: String, declaredBus: String, points: [TripPoint]) async throws -> Int { try fail() }
    public func finishTrip(token: String) async throws { try fail() }
    public func tripReceipt(token: String) async throws -> TripReceipt { try fail() }
    public func busStatus(route: String) async throws -> [StatusRow] { try fail() }
    public func deleteMyAccount() async throws { try fail() }
}
