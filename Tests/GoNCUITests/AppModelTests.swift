import Testing
import Foundation
import GoNCCore
@testable import GoNCUI

final class MockBackend: BackendAPI, @unchecked Sendable {
    var deleteFails = false
    private(set) var followed: [(route: String, stop: String, walk: Int)] = []
    private(set) var profiles: [RiderProfile] = []
    private(set) var deleted = 0
    func upsertRider(_ p: RiderProfile) async throws { profiles.append(p) }
    func followBus(route: String, stop: String, walkMin: Int, prefs: [String: String]) async throws { followed.append((route, stop, walkMin)) }
    func submitReport(route: String, stop: String, kind: Report.Kind) async throws {}
    func routeReports(route: String, weeks: Int) async throws -> [Report] { [] }
    func weeklySummary(route: String) async throws -> String? { nil }
    func uploadTripPoints(token: String, declaredBus: String, points: [TripPoint]) async throws -> Int { 0 }
    func finishTrip(token: String) async throws {}
    func tripReceipt(token: String) async throws -> TripReceipt { TripReceipt(published: true, maxRiders: 4, pointsKept: 0) }
    func busStatus(route: String) async throws -> [StatusRow] { [] }
    func deleteMyAccount() async throws { if deleteFails { throw BackendError("offline") }; deleted += 1 }
    private(set) var pushTokens: [String] = []
    func registerPushToken(_ hex: String) async throws { pushTokens.append(hex) }
}

private let kid = Child(id: "c1", name: "Maya", city: "Cary", school: "Cary High School", districtCode: "67500", bus: "412", stop: "Oak Lane", walkMin: 5)

@MainActor @Suite("App model") struct AppModelTests {
    func make(_ backend: MockBackend = MockBackend(), store: MemoryStore = MemoryStore()) -> (AppModel, MockBackend, MemoryStore) { (AppModel(store: store, backend: backend), backend, store) }

    @Test func savedChildrenComeBackAsParentMode() async {
        let (m1, _, store) = make()
        m1.addChild(kid)
        let m2 = AppModel(store: store, backend: MockBackend())
        await m2.load()
        #expect(m2.mode == .parent && m2.children == [kid])
    }
    @Test func addingAChildFollowsTheBusWithoutTheName() async throws {
        let (m, b, _) = make()
        m.addChild(kid)
        try await Task.sleep(nanoseconds: 100_000_000)
        #expect(b.followed.count == 1 && b.followed[0].route == "412" && b.followed[0].stop == "Oak Lane" && b.followed[0].walk == 5)
        #expect(m.mode == .parent && m.activeChild == 0)
    }
    @Test func removingTheLastChildGoesHome() {
        let (m, _, store) = make()
        m.addChild(kid); m.removeChild("c1")
        #expect(m.mode == nil && m.stage == .welcome && m.children.isEmpty)
        #expect(store.get(LocalKeys.children) == "[]")
    }
    @Test func appearanceAndTermsPersist() async {
        let (m, _, store) = make()
        m.setAppearance(.dark); m.agreeToTerms()
        let m2 = AppModel(store: store, backend: MockBackend())
        await m2.load()
        #expect(m2.appearance == .dark && m2.termsAccepted && m2.termsChecked)
    }
    @Test func changedTermsAskAgain() async {
        let store = MemoryStore(); store.set("2020-01-01", for: LocalKeys.terms)
        let m = AppModel(store: store, backend: MockBackend())
        await m.load()
        #expect(!m.termsAccepted && m.termsChecked)
    }
    @Test func peopleWhoSetUpBeforeAgreeingAreAskedFirst() async {
        let (m1, _, store) = make(); m1.addChild(kid)
        let m2 = AppModel(store: store, backend: MockBackend()); await m2.load()
        #expect(m2.mustAgreeFirst)
        m2.agreeToTerms()
        #expect(!m2.mustAgreeFirst)
    }
    @Test func underThirteenCannotBecomeARider() {
        let (m, _, _) = make()
        m.finishRider(name: "Sam", dob: YMD(y: Calendar.current.component(.year, from: Date()) - 10, m: 1, d: 1), schoolId: "Cary · X", bus: "1", districtCode: "67500", studentId: "123456", pickupMin: 400, leaveMin: 900)
        #expect(m.mode == nil)
    }
    @Test func riderProfileSendsOnlyTheBirthYear() async throws {
        let (m, b, _) = make()
        m.finishRider(name: "Sam", dob: YMD(y: 2011, m: 3, d: 7), schoolId: "Cary · Cary High School", bus: "412", districtCode: "67500", studentId: "123456789", pickupMin: 7 * 60 + 5, leaveMin: 15 * 60 + 30)
        try await Task.sleep(nanoseconds: 100_000_000)
        #expect(m.mode == .rider && m.riderName == "Sam")
        let p = try #require(b.profiles.first)
        #expect(p.birthYear == 2011 && p.amWindowStart == "06:50" && p.pmWindowEnd == "16:45")
        let json = String(data: try JSONEncoder().encode(p), encoding: .utf8)!
        #expect(!json.contains("03/07") && !json.contains("Sam"))      // no full birthday, no name
    }
    @Test func deleteAccountWipesThePhoneOnlyAfterTheServerAgrees() async {
        let (m, b, store) = make()
        m.addChild(kid); m.setAppearance(.dark); m.agreeToTerms()
        #expect(await m.deleteAccount())
        #expect(b.deleted == 1 && m.mode == nil && m.children.isEmpty && m.stage == .welcome)
        for k in LocalKeys.all { #expect(store.get(k) == nil, "key \(k) should be gone") }
    }
    @Test func failedDeleteKeepsEverything() async {
        let b = MockBackend(); b.deleteFails = true
        let (m, _, store) = make(b)
        m.addChild(kid)
        #expect(await m.deleteAccount() == false)
        #expect(m.mode == .parent && m.children == [kid] && store.get(LocalKeys.children) != nil)
    }
    @Test func demoDoesNotTouchSavedChildren() {
        let (m, _, _) = make()
        m.addChild(kid); m.demo = true
        #expect(m.child?.id == "demo" && m.children == [kid])
        m.demo = false
        #expect(m.child == kid)
    }
    @Test func pushTokenIsRegisteredWithTheBackend() async throws {
        let (m, b, _) = make()
        m.registerPushToken("abc123")
        try await Task.sleep(nanoseconds: 100_000_000)
        #expect(b.pushTokens == ["abc123"])
    }
}
