import Testing
import Foundation
@testable import GoNCCore

private let cal = Calendar.current
private func at(_ y: Int, _ m: Int, _ d: Int, _ h: Int = 12) -> Date { cal.date(from: DateComponents(year: y, month: m, day: d, hour: h))! }

@Suite("Terms, appearance, eligibility") struct SmallThings {
    @Test func termsAskWhenMissingOrOld() {
        #expect(Terms.needsAgreement(stored: nil))
        #expect(Terms.needsAgreement(stored: "2020-01-01"))
        #expect(!Terms.needsAgreement(stored: Terms.version))
    }
    @Test func appearanceResolves() {
        #expect(Appearance.resolve(.system, system: .dark) == .dark)
        #expect(Appearance.resolve(.system, system: nil) == .light)
        #expect(Appearance.resolve(.light, system: .dark) == .light)
        #expect(Appearance.resolve(.dark, system: .light) == .dark)
    }
    @Test func eligibilityTurnsOverOnTheBirthday() {
        let today = at(2026, 10, 11)
        #expect(Eligibility.minRiderAge == 13)
        #expect(Eligibility.isEligibleRider(YMD(y: 2013, m: 10, d: 11), today: today))
        #expect(!Eligibility.isEligibleRider(YMD(y: 2013, m: 10, d: 12), today: today))
        #expect(!Eligibility.isEligibleRider(YMD(y: 2014, m: 6, d: 1), today: today))
        #expect(Eligibility.isEligibleRider(YMD(y: 2000, m: 1, d: 1), today: today))
    }
    @Test func localKeysAreUniqueAndNamespaced() {
        #expect(Set(LocalKeys.all).count == LocalKeys.all.count)
        #expect(LocalKeys.all.allSatisfy { $0.hasPrefix("gonc.") })
    }
}

@Suite("Dates and times") struct DatesAndTimes {
    @Test func calendarMath() {
        #expect(YMD.daysInMonth(year: 2024, month: 2) == 29)
        #expect(YMD.daysInMonth(year: 2026, month: 2) == 28)
        #expect(YMD.daysInMonth(year: 2026, month: 10) == 31)
        #expect(YMD.firstWeekday(year: 2026, month: 10) == 4)   // Oct 1 2026 is a Thursday
        #expect(YMD(y: 2011, m: 3, d: 7).formatted == "03/07/2011")
        #expect(YMD(y: 2027, m: 1, d: 1).isFuture(at(2026, 10, 11)))
    }
    @Test func timeLabels() {
        #expect(Times.label(7 * 60 + 5) == "7:05 AM")
        #expect(Times.label(0) == "12:00 AM")
        #expect(Times.label(12 * 60) == "12:00 PM")
        #expect(Times.label(15 * 60 + 40) == "3:40 PM")
    }
    @Test func parseInvertsLabelForEveryOption() {
        for o in Times.morningOptions + Times.afternoonOptions { #expect(Times.label(Times.parse(o)!) == o) }
        #expect(Times.parse("nope") == nil)
        #expect(Times.parse("13:00 PM") == nil)
    }
    @Test func optionRanges() {
        #expect(Times.morningOptions.first == "5:00 AM")
        #expect(Times.morningOptions.last == "10:00 AM")
        #expect(Times.afternoonOptions.last == "6:00 PM")
        #expect(Times.options(from: 0, to: 10, step: 5).count == 3)
    }
    @Test func sensingWindows() {
        let w = Times.windows(pickup: 7 * 60 + 5, leave: 15 * 60 + 30)
        #expect(w == Times.Windows(amStart: "06:50", amEnd: "08:05", pmStart: "15:20", pmEnd: "16:45"))
        #expect(Times.hhmm(65) == "01:05")
    }
    @Test func studentIDs() {
        #expect(Times.isStudentID("123456789"))
        #expect(Times.isStudentID(" 123456 "))
        #expect(!Times.isStudentID("1234"))
        #expect(!Times.isStudentID("12a456"))
    }
}

@Suite("Districts and schools") struct DistrictsAndSchools {
    @Test func codesAreFiveDigitsAndUnique() {
        #expect(Districts.all.allSatisfy { Districts.isCode($0.code) })
        #expect(Set(Districts.all.map(\.code)).count == Districts.all.count)
        #expect(Districts.isCode("67500"))
        #expect(!Districts.isCode("6750"))
        #expect(!Districts.isCode("67a00"))
    }
    @Test func defaultsAndLabels() {
        #expect(Districts.defaultFor(city: "Cary")?.code == "67500")
        #expect(Districts.defaultFor(city: "Durham") == nil)
        #expect(Districts.byLabel(Districts.all[2].label) == Districts.all[2])
    }
    @Test func schoolsListedHighSchoolsFirst() {
        #expect(Schools.cities.contains("Cary") && Schools.cities.contains("Raleigh"))
        #expect(Schools.schools(in: "Cary").first!.lowercased().contains("high"))
        #expect(Schools.schools(in: "Nowhere").isEmpty)
        let all = Schools.cities.flatMap(Schools.schools(in:))
        #expect(!all.contains { $0.contains("Cary-Grove") || $0.contains("Pike County") })
    }
}

@Suite("Insights, weekly, rides") struct ReportsAndRides {
    private let now = at(2026, 10, 14)   // a Wednesday
    private func day(_ n: Int) -> Date { cal.date(byAdding: .day, value: -n, to: now)! }

    @Test func insightsNoReports() {
        let i = Insights.compute([], now: now)
        #expect(i.trend == .none && i.worstDay == nil && i.trendText == "No reports yet")
    }
    @Test func insightsBucketsByWeek() {
        let i = Insights.compute([Report(kind: .noShow, t: day(1)), Report(kind: .noShow, t: day(2)), Report(kind: .noShow, t: day(9)), Report(kind: .early, t: day(3))], now: now)
        #expect(i.series == [0, 0, 1, 2] && i.thisWeek == 2 && i.lastWeek == 1 && i.trend == .up && i.totalEarly == 1)
    }
    @Test func insightsIgnoreOutOfRange() {
        let i = Insights.compute([Report(kind: .noShow, t: day(40)), Report(kind: .noShow, t: day(-2))], now: now)
        #expect(i.totalNoShow == 0)
    }
    @Test func insightsWorstDayAndTrendDown() {
        let w = Insights.compute([Report(kind: .noShow, t: day(1)), Report(kind: .noShow, t: day(8)), Report(kind: .noShow, t: day(2))], now: now)
        #expect(w.worstDay == "Tuesday")
        let d = Insights.compute([Report(kind: .noShow, t: day(8)), Report(kind: .noShow, t: day(9)), Report(kind: .noShow, t: day(1))], now: now)
        #expect(d.trend == .down && d.trendText == "Down from 2 last week")
    }

    @Test func weekStartIsMonday() {
        #expect(cal.component(.day, from: Weekly.weekStart(at(2026, 10, 12))) == 12)
        #expect(cal.component(.day, from: Weekly.weekStart(at(2026, 10, 14))) == 12)
        #expect(cal.component(.day, from: Weekly.weekStart(at(2026, 10, 18, 23))) == 12)
        #expect(cal.component(.day, from: Weekly.weekStart(at(2026, 10, 19))) == 19)
    }
    @Test func weekOptionsGoBackwards() {
        let o = Weekly.options(now: now)
        #expect(o.count == 8 && o[0].label.hasPrefix("This week") && o[1].label.hasPrefix("Last week"))
        #expect(cal.component(.day, from: o[2].start) == 28 && cal.component(.month, from: o[2].start) == 9)
        #expect(Set(o.map(\.label)).count == 8)
    }
    @Test func dailyBreakdown() {
        let monday = at(2026, 10, 12, 0)
        #expect(Weekly.daily([], weekStart: monday).count == 5)
        let days = Weekly.daily([Report(kind: .noShow, t: at(2026, 10, 13)), Report(kind: .noShow, t: at(2026, 10, 13, 15)), Report(kind: .early, t: at(2026, 10, 15))], weekStart: monday)
        #expect(days[1].noShow == 2 && days[3].early == 1)
        #expect(Weekly.totals(days) == (2, 1))
        #expect(Weekly.daily([Report(kind: .noShow, t: at(2026, 10, 17))], weekStart: monday).count == 6)
        #expect(Weekly.totals(Weekly.daily([Report(kind: .noShow, t: at(2026, 10, 5)), Report(kind: .noShow, t: at(2026, 10, 19))], weekStart: monday)) == (0, 0))
    }

    private func ride(_ id: String, _ start: Date, published: Bool? = true, riders: Int? = 4) -> Ride {
        Ride(id: id, startedAt: start, endedAt: start.addingTimeInterval(18 * 60), bus: "412", published: published, maxRiders: riders)
    }
    @Test func ridesNewestFirstCappedNoDuplicates() {
        var list = Ride.adding(ride("a", Date(timeIntervalSince1970: 1000)), to: [])
        list = Ride.adding(ride("b", Date(timeIntervalSince1970: 5000)), to: list)
        #expect(list.map(\.id) == ["b", "a"])
        #expect(Ride.adding(ride("a", Date(timeIntervalSince1970: 1000), published: false), to: list).first { $0.id == "a" }?.published == false)
        var many: [Ride] = []
        for i in 0..<60 { many = Ride.adding(ride(String(i), Date(timeIntervalSince1970: Double(i) * 1000)), to: many) }
        #expect(many.count == 50 && many[0].id == "59")
    }
    @Test func rideTextIsHonest() {
        #expect(ride("x", now).outcomeText == "Shared with 4 riders")
        #expect(ride("x", now, published: false, riders: 2).outcomeText == "Not shown: fewer than 3 riders")
        #expect(ride("x", now, published: nil, riders: nil).outcomeText == "Receipt unavailable")
        #expect(ride("x", now).durationMin == 18)
        #expect(ride("x", at(2026, 10, 14, 7)).title(now: at(2026, 10, 14, 15)).hasPrefix("Today, "))
        #expect(ride("x", at(2026, 10, 13, 7)).title(now: at(2026, 10, 14, 15)).hasPrefix("Yesterday, "))
    }
    @Test func leaveBy() {
        #expect(LeaveBy.minutes(etaLo: 10, walkMin: 3) == 5)
        #expect(LeaveBy.minutes(etaLo: 2, walkMin: 3) == 0)
        #expect(LeaveBy.minutes(etaLo: nil, walkMin: 3) == nil)
        #expect(BusSource.noData.label == "NO DATA")
    }
}

@Suite("Alert rules") struct Alerts {
    typealias R = AlertRules
    let base = R.Prefs(walkMin: 3, quietNow: false, lastPushMinAgoForStop: nil, alreadySentLeaveNow: false)
    @Test func leaveNowRules() {
        #expect(R.leaveNow(.init(source: .live, etaLo: 5, ageMin: 0), base).sends)
        #expect(!R.leaveNow(.init(source: .live, etaLo: 9, ageMin: 0), base).sends)
        #expect(!R.leaveNow(.init(source: .recent, etaLo: 3, ageMin: 4), base).sends)
        if case .send(_, let text) = R.leaveNow(.init(source: .estimate, etaLo: 3, ageMin: 0), base) { #expect(text.contains("(estimate)")) } else { Issue.record("estimate should send") }
        let s = R.Status(source: .live, etaLo: 3, ageMin: 0)
        var p = base; p.alreadySentLeaveNow = true; #expect(!R.leaveNow(s, p).sends)
        p = base; p.quietNow = true; #expect(!R.leaveNow(s, p).sends)
        p = base; p.lastPushMinAgoForStop = 2; #expect(!R.leaveNow(s, p).sends)
    }
    @Test func runningLateNeedsTwoRefreshes() {
        var r = R.runningLate(lateMin: 8, state: .init(), quietNow: false, lastPushMinAgo: nil)
        #expect(!r.decision.sends)
        r = R.runningLate(lateMin: 8, state: r.state, quietNow: false, lastPushMinAgo: nil)
        #expect(r.decision.sends)
        #expect(!R.runningLate(lateMin: 3, state: .init(active: true, consecutiveOver: 2, minSinceLastPush: 20), quietNow: false, lastPushMinAgo: nil).state.active)
        #expect(!R.runningLate(lateMin: 9, state: .init(active: false, consecutiveOver: 5, minSinceLastPush: 4), quietNow: false, lastPushMinAgo: nil).decision.sends)
    }
    @Test func notSeenAndPassed() {
        if case .send(_, let t) = R.notSeenYet(minPastUsual: 10, hasLiveOrRecent: false, quietNow: false, lastPushMinAgo: nil) { #expect(t.contains("https://busupdates.wcpss.net")) } else { Issue.record("should send") }
        #expect(!R.notSeenYet(minPastUsual: 20, hasLiveOrRecent: true, quietNow: false, lastPushMinAgo: nil).sends)
        #expect(R.passedStop(metersPast: 100, source: .live, quietNow: false, lastPushMinAgo: nil).sends)
        #expect(!R.passedStop(metersPast: 99, source: .live, quietNow: false, lastPushMinAgo: nil).sends)
        #expect(!R.passedStop(metersPast: 500, source: .recent, quietNow: false, lastPushMinAgo: nil).sends)
    }
    @Test func quietHoursAndSwitches() {
        #expect(R.isQuiet(now: "22:30", start: "21:00", end: "06:30"))
        #expect(R.isQuiet(now: "02:00", start: "21:00", end: "06:30"))
        #expect(!R.isQuiet(now: "07:00", start: "21:00", end: "06:30"))
        #expect(!R.isQuiet(now: "20:59", start: "21:00", end: "06:30"))
        #expect(R.isQuiet(now: "13:00", start: "12:00", end: "14:00"))
        #expect(!R.isQuiet(now: "03:00", start: "21:00", end: "21:00"))
        #expect(!R.isQuiet(now: "03:00", start: nil, end: nil))
        #expect(R.alertEnabled([:], key: "leave_now") && R.alertEnabled(nil, key: "leave_now"))
        #expect(!R.alertEnabled(["leave_now": false], key: "leave_now"))
    }
}

@Suite("Classifier") struct ClassifierTests {
    struct Vector: Decodable { let window: [[Double]]; let features: [Double]; let p_bus: Double }
    func vectors() throws -> [Vector] {
        let url = Bundle.module.url(forResource: "vectors", withExtension: "json", subdirectory: "Resources") ?? Bundle.module.url(forResource: "vectors", withExtension: "json")!
        return try JSONDecoder().decode([Vector].self, from: Data(contentsOf: url))
    }
    @Test func handComputedSigmoid() {
        let m = LogisticModel(features: ["a", "b"], mean: [0, 0], scale: [1, 1], weights: [1, -1], bias: 0)
        #expect(abs(m.probability([2, 1]) - 0.7310585786) < 1e-8)
        #expect(abs(m.probability([1, 1]) - 0.5) < 1e-10)
        #expect(m.probability([1e6, 0]) <= 1 && m.probability([-1e6, 0]) >= 0)
        let s = LogisticModel(features: ["a", "b"], mean: [10, 0], scale: [2, 1], weights: [1, -1], bias: 0)
        #expect(abs(s.probability([12, 1]) - 0.5) < 1e-10)
    }
    @Test func uploadThresholdAndFailClosed() {
        let m = LogisticModel(features: ["a", "b"], mean: [0, 0], scale: [1, 1], weights: [1, -1], bias: 0)
        #expect(LogisticModel.uploadThreshold == 0.7)
        #expect(m.shouldUpload([2, 1]) && !m.shouldUpload([1, 1]))
        #expect(!m.shouldUpload([1]))                 // wrong length
        #expect(!m.shouldUpload([.nan, 0]))           // not finite
    }
    @Test func matchesPythonOnSharedVectors() throws {
        let vs = try vectors()
        #expect(vs.count == 12)
        for v in vs {
            let f = WindowFeatures.compute(v.window)
            for k in 0..<6 { #expect(abs(f[k] - v.features[k]) < 1e-6, "feature \(k)") }
            #expect(abs(LogisticModel.shipped.probability(v.features) - v.p_bus) < 1e-8)
        }
    }
}
