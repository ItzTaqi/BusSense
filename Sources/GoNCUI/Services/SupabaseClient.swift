import Foundation
import GoNCCore

/// Supabase Auth + PostgREST over plain URLSession (no SDK). Anonymous sign-in; the session lives in the Keychain.
public struct BackendConfig: Sendable {
    public var url: URL?
    public var anonKey: String
    /// Reads GONC_SUPABASE_URL and GONC_SUPABASE_ANON_KEY from Info.plist, then from the environment. Never hard-code keys in git.
    public static func fromBundle() -> BackendConfig {
        func value(_ k: String) -> String? { (Bundle.main.object(forInfoDictionaryKey: k) as? String) ?? ProcessInfo.processInfo.environment[k] }
        let url = value("GONC_SUPABASE_URL").flatMap(URL.init(string:))
        return BackendConfig(url: url?.host == nil ? nil : url, anonKey: value("GONC_SUPABASE_ANON_KEY") ?? "")
    }
    public var isConfigured: Bool { url != nil && !anonKey.isEmpty }
}

actor SessionHolder {
    struct Session: Codable { var accessToken: String; var refreshToken: String; var expiresAt: Date; var userId: String
        enum CodingKeys: String, CodingKey { case accessToken = "access_token", refreshToken = "refresh_token", expiresAt, userId } }
    var session: Session?
    func set(_ s: Session?) { session = s }
}

public final class SupabaseClient: @unchecked Sendable {
    let config: BackendConfig
    let store: KeyValueStore
    private let holder = SessionHolder()
    private let urlSession: URLSession

    public init(config: BackendConfig, store: KeyValueStore, urlSession: URLSession = .shared) {
        self.config = config; self.store = store; self.urlSession = urlSession
    }

    static let iso: ISO8601DateFormatter = { let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return f }()
    static let isoPlain = ISO8601DateFormatter()
    static func decoder() -> JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { dec in
            let s = try dec.singleValueContainer().decode(String.self)
            if let date = iso.date(from: s) ?? isoPlain.date(from: s) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: dec.codingPath, debugDescription: "Bad date \(s)"))
        }
        return d
    }
    static func encoder() -> JSONEncoder {
        let e = JSONEncoder(); e.dateEncodingStrategy = .custom { date, enc in var c = enc.singleValueContainer(); try c.encode(iso.string(from: date)) }; return e
    }

    private func base() throws -> URL { guard let u = config.url, config.isConfigured else { throw BackendError("No server configured") }; return u }

    // MARK: session

    private struct AuthResponse: Decodable {
        struct User: Decodable { let id: String }
        let access_token: String, refresh_token: String, expires_in: Double; let user: User
    }
    private func adopt(_ r: AuthResponse) async -> SessionHolder.Session {
        let s = SessionHolder.Session(accessToken: r.access_token, refreshToken: r.refresh_token, expiresAt: Date().addingTimeInterval(r.expires_in), userId: r.user.id)
        await holder.set(s)
        if let data = try? JSONEncoder().encode(s), let text = String(data: data, encoding: .utf8) { store.set(text, for: LocalKeys.session) }
        return s
    }
    private func authCall(_ path: String, query: [URLQueryItem] = [], body: [String: String]) async throws -> AuthResponse {
        var comps = URLComponents(url: try base().appendingPathComponent("auth/v1/\(path)"), resolvingAgainstBaseURL: false)!
        comps.queryItems = query.isEmpty ? nil : query
        var req = URLRequest(url: comps.url!); req.httpMethod = "POST"
        req.setValue(config.anonKey, forHTTPHeaderField: "apikey"); req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await urlSession.data(for: req)
        guard (resp as? HTTPURLResponse)?.statusCode == 200 else { throw BackendError("Sign-in failed") }
        return try JSONDecoder().decode(AuthResponse.self, from: data)
    }

    /// A valid access token, creating an anonymous account on first use and refreshing when it is about to expire.
    public func accessToken() async throws -> String {
        if await holder.session == nil, let text = store.get(LocalKeys.session), let s = try? JSONDecoder().decode(SessionHolder.Session.self, from: Data(text.utf8)) { await holder.set(s) }
        if let s = await holder.session {
            if s.expiresAt > Date().addingTimeInterval(60) { return s.accessToken }
            if let r = try? await authCall("token", query: [.init(name: "grant_type", value: "refresh_token")], body: ["refresh_token": s.refreshToken]) { return await adopt(r).accessToken }
        }
        return await adopt(try await authCall("signup", body: [:])).accessToken     // anonymous sign-in
    }
    public func userId() async -> String? { await holder.session?.userId }
    public func signOutLocally() async { await holder.set(nil); store.remove(LocalKeys.session) }

    // MARK: REST

    func send(_ method: String, _ path: String, query: [URLQueryItem] = [], body: Data? = nil, extra: [String: String] = [:]) async throws -> Data {
        var comps = URLComponents(url: try base().appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        comps.queryItems = query.isEmpty ? nil : query
        var req = URLRequest(url: comps.url!); req.httpMethod = method; req.httpBody = body; req.timeoutInterval = 20
        req.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(try await accessToken())", forHTTPHeaderField: "Authorization")
        if body != nil { req.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        for (k, v) in extra { req.setValue(v, forHTTPHeaderField: k) }
        let (data, resp) = try await urlSession.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else { throw BackendError("Server error \(code)") }
        return data
    }
    func rpc<T: Decodable>(_ name: String, _ params: [String: Any] = [:], as: T.Type = T.self) async throws -> T {
        let data = try await send("POST", "rest/v1/rpc/\(name)", body: try JSONSerialization.data(withJSONObject: params))
        return try Self.decoder().decode(T.self, from: data)
    }
    func rpcVoid(_ name: String, _ params: [String: Any] = [:]) async throws { _ = try await send("POST", "rest/v1/rpc/\(name)", body: try JSONSerialization.data(withJSONObject: params)) }
    func select<T: Decodable>(_ table: String, _ query: [URLQueryItem]) async throws -> [T] {
        try Self.decoder().decode([T].self, from: try await send("GET", "rest/v1/\(table)", query: query))
    }
    func upsert<B: Encodable>(_ table: String, _ body: B, onConflict: String) async throws {
        _ = try await send("POST", "rest/v1/\(table)", query: [.init(name: "on_conflict", value: onConflict)], body: try Self.encoder().encode(body),
                           extra: ["Prefer": "resolution=merge-duplicates,return=minimal"])
    }
}

/// The real backend: tables through PostgREST, privileged work through SQL functions (see supabase/migrations/0005_swift_backend.sql).
public final class SupabaseBackend: BackendAPI, @unchecked Sendable {
    let client: SupabaseClient
    public init(client: SupabaseClient) { self.client = client }

    public func upsertRider(_ p: RiderProfile) async throws {
        _ = try await client.accessToken()
        guard let uid = await client.userId() else { throw BackendError("Not signed in") }
        struct Row: Encodable { let id: String; let profile: RiderProfile
            func encode(to e: Encoder) throws { try profile.encode(to: e); var c = e.container(keyedBy: Key.self); try c.encode(id, forKey: .id) }
            enum Key: String, CodingKey { case id } }
        try await client.upsert("riders", Row(id: uid, profile: p), onConflict: "id")
    }
    public func followBus(route: String, stop: String, walkMin: Int, prefs: [String: String]) async throws {
        _ = try await client.accessToken()
        guard let uid = await client.userId() else { throw BackendError("Not signed in") }
        struct Follower: Encodable { let id: String; let walk_min: Int }
        struct Follow: Encodable { let follower_id: String; let route_label: String; let stop_id: String; let alert_prefs: [String: String] }
        try await client.upsert("followers", Follower(id: uid, walk_min: walkMin), onConflict: "id")
        try await client.upsert("follows", Follow(follower_id: uid, route_label: route, stop_id: stop, alert_prefs: prefs), onConflict: "follower_id,route_label,stop_id")
    }
    public func submitReport(route: String, stop: String, kind: Report.Kind) async throws {
        try await client.rpcVoid("submit_report", ["p_route": route, "p_stop": stop, "p_kind": kind.rawValue])
    }
    public func routeReports(route: String, weeks: Int) async throws -> [Report] {
        struct Row: Decodable { let kind: Report.Kind; let t: Date }
        return try await client.rpc("route_reports", ["p_route": route, "p_weeks": weeks], as: [Row].self).map { Report(kind: $0.kind, t: $0.t) }
    }
    public func weeklySummary(route: String) async throws -> String? {
        struct Row: Decodable { let summary: String }
        let rows: [Row] = try await client.select("weekly_summaries", [.init(name: "route_label", value: "eq.\(route)"), .init(name: "order", value: "week_start.desc"), .init(name: "limit", value: "1"), .init(name: "select", value: "summary")])
        return rows.first?.summary
    }
    public func uploadTripPoints(token: String, declaredBus: String, points: [TripPoint]) async throws -> Int {
        let pts = try JSONSerialization.jsonObject(with: SupabaseClient.encoder().encode(points))
        return try await client.rpc("upload_trip_points", ["p_trip_token": token, "p_declared_bus": declaredBus, "p_points": pts], as: Int.self)
    }
    public func finishTrip(token: String) async throws { try await client.rpcVoid("finish_trip", ["p_trip_token": token]) }
    public func tripReceipt(token: String) async throws -> TripReceipt {
        let rows: [TripReceipt] = try await client.rpc("trip_receipt", ["p_trip_token": token])
        guard let r = rows.first else { throw BackendError("No receipt") }
        return r
    }
    public func busStatus(route: String) async throws -> [StatusRow] {
        try await client.select("bus_status", [.init(name: "route_label", value: "eq.\(route)")])
    }
    public func deleteMyAccount() async throws { try await client.rpcVoid("delete_my_account") }
    public func registerPushToken(_ hex: String) async throws {
        _ = try await client.accessToken()
        guard let uid = await client.userId() else { throw BackendError("Not signed in") }
        struct Row: Encodable { let id: String; let push_token: String }
        try await client.upsert("followers", Row(id: uid, push_token: hex), onConflict: "id")
    }
}
