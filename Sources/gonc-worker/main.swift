import Foundation
import Logging
import PostgresNIO
import GoNCCore
import GoNCEngine

// gonc-worker: the server side of GoNC, in Swift.
//   1. clustering   every 15 s: trip points -> companions -> tracks -> bus_tracks / bus_status   (role goyellow_worker, anonymous data only)
//   2. dispatching  every 15 s: bus_status changes -> push alerts                                (role goyellow_dispatch, optional)
//   3. summaries    hourly: one AI weekly report per route per week, from report counts only     (role goyellow_dispatch + ANTHROPIC_API_KEY, optional)
// Environment: WORKER_DATABASE_URL (required), DISPATCH_DATABASE_URL, ANTHROPIC_API_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_TOPIC, APNS_KEY_FILE, APNS_SANDBOX=1
let log = Logger(label: "gonc-worker")
let env = ProcessInfo.processInfo.environment

func weekStartString(_ now: Date = Date()) -> String {
    let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = TimeZone(identifier: "America/New_York")
    return f.string(from: Weekly.weekStart(now))
}

guard let workerURL = env["WORKER_DATABASE_URL"] else { log.critical("Set WORKER_DATABASE_URL (role goyellow_worker). See README."); exit(1) }

do {
    let workerClient = try makeClient(url: workerURL)
    let dispatchClient = try env["DISPATCH_DATABASE_URL"].map(makeClient(url:))
    let loop = WorkerLoop(store: PostgresWorkerStore(client: workerClient, log: log))

    let sender: PushSender = {
        if let key = env["APNS_KEY_ID"], let team = env["APNS_TEAM_ID"], let topic = env["APNS_TOPIC"], let file = env["APNS_KEY_FILE"], let pem = try? String(contentsOfFile: file, encoding: .utf8) {
            return APNsSender(keyID: key, teamID: team, topic: topic, privateKeyPEM: pem, sandbox: env["APNS_SANDBOX"] == "1")
        }
        return LogPushSender(log: log)
    }()
    let summarizer: Summarizer? = env["ANTHROPIC_API_KEY"].map { AnthropicSummarizer(apiKey: $0) }

    await withTaskGroup(of: Void.self) { group in
        group.addTask { await workerClient.run() }
        if let dispatchClient { group.addTask { await dispatchClient.run() } }

        group.addTask {   // 1. clustering
            while !Task.isCancelled {
                let started = Date()
                do { try await loop.tick(now: started.timeIntervalSince1970) } catch { log.error("tick failed: \(error)") }
                try? await Task.sleep(nanoseconds: UInt64(max(0, WorkerLoop.intervalS - Date().timeIntervalSince(started)) * 1e9))
            }
        }
        if let dispatchClient {
            let store = DispatchStore(client: dispatchClient, log: log)
            let dispatcher = PushDispatcher(sender: sender)
            group.addTask {   // 2. dispatching
                var since = Date().timeIntervalSince1970
                while !Task.isCancelled {
                    let upTo = Date().timeIntervalSince1970
                    do {
                        for (status, updatedAt) in try await store.changedStatuses(since: since) {
                            let follows = try await store.follows(route: status.routeLabel, stop: status.stopId)
                            await dispatcher.process(status: status, follows: follows, statusAgeMin: max(0, (upTo - updatedAt) / 60))
                        }
                        since = upTo
                    } catch { log.error("dispatch failed: \(error)") }
                    try? await Task.sleep(nanoseconds: 15_000_000_000)
                }
            }
            if let summarizer {
                group.addTask {   // 3. weekly AI summaries
                    while !Task.isCancelled {
                        do {
                            let week = weekStartString()
                            for route in try await store.routesWithReports() where !(try await store.hasSummary(route: route, weekStart: week)) {
                                let insights = Insights.compute(try await store.reports(route: route))
                                guard insights.totalNoShow + insights.totalEarly > 0 else { continue }
                                try await store.saveSummary(route: route, weekStart: week, text: try await summarizer.summarize(insights))
                                log.info("wrote weekly summary for route \(route)")
                            }
                        } catch { log.error("summary job failed: \(error)") }
                        try? await Task.sleep(nanoseconds: 3_600_000_000_000)
                    }
                }
            }
        }
        log.info("gonc-worker running. clustering: on, dispatching: \(dispatchClient != nil ? "on" : "off"), AI summaries: \(summarizer != nil ? "on" : "off")")
    }
} catch { log.critical("could not start: \(error)"); exit(1) }
