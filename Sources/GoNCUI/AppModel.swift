import SwiftUI
import Observation
import GoNCCore

public enum Mode: String, Sendable { case rider, parent }
public enum Stage: Sendable { case welcome, terms, role, riderSetup, parentSetup }
public enum RiderStatus: Sendable { case sleeping, listening, onBus, paused }
public enum AppTab: Hashable, Sendable { case home, report, settings }
public enum SettingsPage: Hashable, Sendable { case notifications, privacy, rides }

/// Everything the screens share: where you are in the flow, what is saved on the phone, and the rider's trip.
/// Each person only ever sees their own role's screens (chosen on the second screen).
@MainActor @Observable
public final class AppModel {
    // flow
    public var stage: Stage = .welcome
    public var mode: Mode?
    public var addingChild = false
    public var demo = false
    public var tab: AppTab = .home
    public var settingsPath: [SettingsPage] = []

    // saved on the phone
    public var appearance: Appearance = .system
    public var language: Language = .en
    public var termsAccepted = false
    public var termsChecked = false
    public var children: [Child] = []
    public var activeChild = 0
    public var riderName = ""
    public var declaredBus = ""
    public var rides: [Ride] = []
    public var alertPrefs = AlertPrefs()

    // rider trip (not saved)
    public var riderStatus: RiderStatus = .sleeping
    public var kRiders = 0
    public var tripStartedAt: Date?
    public var tripError: String?

    public let store: KeyValueStore
    public private(set) var backend: BackendAPI
    private let supabase: SupabaseClient?
    private let trips: TripService

    public init(store: KeyValueStore = KeychainStore(), backend: BackendAPI? = nil) {
        self.store = store
        self.trips = TripService()
        if let backend { self.backend = backend; self.supabase = nil }
        else {
            let config = BackendConfig.fromBundle()
            if config.isConfigured { let c = SupabaseClient(config: config, store: store); self.supabase = c; self.backend = SupabaseBackend(client: c) }
            else { self.supabase = nil; self.backend = OfflineBackend() }
        }
    }

    public var child: Child? { demo ? DemoScenario.child : (children.isEmpty ? nil : children[min(activeChild, children.count - 1)]) }
    public var mustAgreeFirst: Bool { mode != nil && termsChecked && !termsAccepted }

    // MARK: saved data

    private func decode<T: Decodable>(_ key: String, as: T.Type = T.self) -> T? { store.get(key).flatMap { try? JSONDecoder().decode(T.self, from: Data($0.utf8)) } }
    private func save<T: Encodable>(_ value: T, _ key: String) { if let d = try? JSONEncoder().encode(value), let s = String(data: d, encoding: .utf8) { store.set(s, for: key) } }
    private struct RiderSave: Codable { var name: String; var bus: String }

    public func load() async {
        if let raw = store.get(LocalKeys.appearance), let a = Appearance(rawValue: raw) { appearance = a }
        termsAccepted = !Terms.needsAgreement(stored: store.get(LocalKeys.terms)); termsChecked = true
        rides = decode(LocalKeys.rides) ?? []
        alertPrefs = decode(LocalKeys.alertPrefs) ?? AlertPrefs()
        if let kids: [Child] = decode(LocalKeys.children), !kids.isEmpty { children = kids; mode = .parent }
        else if let r: RiderSave = decode(LocalKeys.riderName) { riderName = r.name; declaredBus = r.bus; mode = .rider }
    }

    public func setAppearance(_ a: Appearance) { appearance = a; store.set(a.rawValue, for: LocalKeys.appearance) }
    public func agreeToTerms() { termsAccepted = true; store.set(Terms.version, for: LocalKeys.terms) }
    public func setAlertPrefs(_ p: AlertPrefs) {
        alertPrefs = p; save(p, LocalKeys.alertPrefs)
        guard let c = child, !demo else { return }
        Task { try? await backend.followBus(route: c.bus, stop: c.stop, walkMin: c.walkMin, prefs: p.serverPrefs) }
    }

    // MARK: parents

    public func addChild(_ c: Child) {
        children.append(c); activeChild = children.count - 1; mode = .parent; addingChild = false; tab = .home
        save(children, LocalKeys.children)
        let prefs = alertPrefs.serverPrefs
        Task { try? await backend.followBus(route: c.bus, stop: c.stop, walkMin: c.walkMin, prefs: prefs) }   // best effort; also saved on this phone
    }
    public func removeChild(_ id: String) {
        children.removeAll { $0.id == id }
        activeChild = min(activeChild, max(0, children.count - 1))
        save(children, LocalKeys.children)
        if children.isEmpty { mode = nil; stage = .welcome; tab = .home }
    }

    // MARK: riders

    public func finishRider(name: String, dob: YMD, schoolId: String, bus: String, districtCode: String, studentId: String, pickupMin: Int, leaveMin: Int) {
        guard Eligibility.isEligibleRider(dob) else { return }
        riderName = name; declaredBus = bus; mode = .rider; tab = .home
        save(RiderSave(name: name, bus: bus), LocalKeys.riderName)
        let profile = RiderProfile(birthYear: dob.y, schoolId: schoolId, declaredBus: bus, districtCode: districtCode, studentId: studentId,
                                   usualPickupTime: Times.hhmm(pickupMin), schoolDismissalTime: Times.hhmm(leaveMin), windows: Times.windows(pickup: pickupMin, leave: leaveMin))
        Task { try? await backend.upsertRider(profile) }   // the full birthday never leaves the phone; only the birth year is sent
    }

    public func startTrip() async {
        tripError = nil
        do {
            _ = try await trips.start(declaredBus: declaredBus, backend: backend) { [weak self] p in
                guard let self, self.riderStatus != .sleeping || self.tripStartedAt != nil else { return }
                self.riderStatus = p >= LogisticModel.uploadThreshold ? .onBus : .listening
            }
            riderStatus = .listening; tripStartedAt = Date()
        } catch { tripError = (error as? TripService.TripError) == .locationDenied ? "Location permission is needed. Turn it on in Settings." : "Couldn't start listening." }
    }

    public func endTrip() async {
        let started = tripStartedAt ?? Date(), ended = Date()
        let token = await trips.end()
        var receipt: TripReceipt?
        if let token { receipt = try? await backend.tripReceipt(token: token) }
        let ride = Ride(id: token ?? UUID().uuidString, startedAt: started, endedAt: ended, bus: declaredBus, published: receipt?.published, maxRiders: receipt?.maxRiders)
        rides = Ride.adding(ride, to: rides); save(rides, LocalKeys.rides)
        riderStatus = .sleeping; kRiders = 0; tripStartedAt = nil
        tab = .settings; settingsPath = [.rides]
    }
    /// Called with the hex device token when the phone registers for remote notifications (see Apps/iOS/GoNCApp.swift).
    public func registerPushToken(_ hex: String) { Task { try? await backend.registerPushToken(hex) } }
    public func toggleNotRidingToday() { riderStatus = riderStatus == .paused ? .sleeping : .paused }
    public func clearRides() { rides = []; save(rides, LocalKeys.rides) }

    // MARK: account

    /// Deletes the account on the server FIRST. Only when that succeeds is this phone erased, so a failed attempt never leaves someone half-deleted.
    public func deleteAccount() async -> Bool {
        if tripStartedAt != nil { await endTrip() }
        do { try await backend.deleteMyAccount() } catch { return false }
        await supabase?.signOutLocally()
        LocalKeys.all.forEach(store.remove)
        reset()
        return true
    }
    public func reset() {
        mode = nil; stage = .welcome; addingChild = false; demo = false; tab = .home; settingsPath = []
        appearance = .system; language = .en; termsAccepted = false; children = []; activeChild = 0; riderName = ""; declaredBus = ""
        rides = []; alertPrefs = AlertPrefs(); riderStatus = .sleeping; kRiders = 0; tripStartedAt = nil; tripError = nil
    }
}
