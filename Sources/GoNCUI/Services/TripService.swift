import Foundation
import CoreLocation
import GoNCCore
#if os(iOS)
import CoreMotion
#endif

/// Rider-side trip service: samples location about every 5 s, computes P(bus) ON THE PHONE from a rolling 180 s window,
/// and uploads points (batched every 15 s) only while P(bus) >= 0.7. Fails closed: if anything is unclear, nothing is uploaded.
/// The trip code is random and made on the phone. Uploaded points carry no user id.
@MainActor
public final class TripService: NSObject, CLLocationManagerDelegate {
    public enum TripError: Error { case locationDenied }

    private struct Sample { var t: Date; var lat: Double; var lon: Double; var speed: Double; var acc: Double; var heading: Double; var az: Double }

    private let manager = CLLocationManager()
    private let model: LogisticModel
    private var backend: BackendAPI = OfflineBackend()
    private var token: String?
    private var declared = ""
    private var samples: [Sample] = []
    private var pending: [TripPoint] = []
    private var azBuffer: [Double] = []
    private var lastSampleAt = Date.distantPast
    private var flushTask: Task<Void, Never>?
    private var onProbability: (@MainActor (Double) -> Void)?
    private var continuation: CheckedContinuation<CLAuthorizationStatus, Never>?
    #if os(iOS)
    private let motion = CMMotionManager()
    #endif

    public static let windowSamples = 36   // 180 s / 5 s

    public init(model: LogisticModel = .shipped) { self.model = model; super.init(); manager.delegate = self }

    /// P(bus) from the last 180 s; 0 until there is at least 60 s of data.
    public func currentProbability() -> Double {
        guard samples.count >= 12 else { return 0 }
        let rows = samples.suffix(Self.windowSamples).map { [$0.speed, $0.heading, $0.az] }
        let p = model.probability(WindowFeatures.compute(rows))
        return p.isFinite ? p : 0
    }

    public func start(declaredBus: String, backend: BackendAPI, onProbability: @escaping @MainActor (Double) -> Void) async throws -> String {
        self.backend = backend; self.onProbability = onProbability
        if manager.authorizationStatus == .notDetermined {
            #if os(iOS)
            manager.requestWhenInUseAuthorization()
            #else
            manager.requestWhenInUseAuthorization()
            #endif
            _ = await withCheckedContinuation { (c: CheckedContinuation<CLAuthorizationStatus, Never>) in continuation = c }
        }
        #if os(iOS)
        guard [.authorizedWhenInUse, .authorizedAlways].contains(manager.authorizationStatus) else { throw TripError.locationDenied }
        if manager.authorizationStatus == .authorizedWhenInUse { manager.requestAlwaysAuthorization() }
        #else
        guard manager.authorizationStatus != .denied && manager.authorizationStatus != .restricted else { throw TripError.locationDenied }
        #endif

        token = UUID().uuidString.lowercased(); declared = declaredBus; samples = []; pending = []; azBuffer = []; lastSampleAt = .distantPast
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = kCLDistanceFilterNone
        #if os(iOS)
        manager.activityType = .automotiveNavigation
        manager.pausesLocationUpdatesAutomatically = false
        // Background updates need the "location" background mode in the app's Info.plist; only switch it on when it is declared.
        if (Bundle.main.object(forInfoDictionaryKey: "UIBackgroundModes") as? [String])?.contains("location") == true {
            manager.allowsBackgroundLocationUpdates = true
            manager.showsBackgroundLocationIndicator = true
        }
        if motion.isAccelerometerAvailable {
            motion.accelerometerUpdateInterval = 0.2
            motion.startAccelerometerUpdates(to: .main) { [weak self] data, _ in if let z = data?.acceleration.z { MainActor.assumeIsolated { self?.azBuffer.append(z) } } }
        }
        #endif
        manager.startUpdatingLocation()
        flushTask = Task { [weak self] in
            while !Task.isCancelled { try? await Task.sleep(nanoseconds: 15_000_000_000); await self?.flush() }
        }
        return token!
    }

    /// Stops listening, uploads what is left, and asks the server to delete this trip's points. Returns the trip code.
    public func end() async -> String? {
        manager.stopUpdatingLocation()
        #if os(iOS)
        motion.stopAccelerometerUpdates()
        #endif
        flushTask?.cancel()
        await flush()
        let t = token
        if let t { try? await backend.finishTrip(token: t) }
        token = nil; samples = []; pending = []
        return t
    }

    private func flush() async {
        guard let token, !pending.isEmpty else { return }
        let batch = Array(pending.prefix(10)); pending.removeFirst(batch.count)
        do { _ = try await backend.uploadTripPoints(token: token, declaredBus: declared, points: batch) }
        catch { pending.insert(contentsOf: batch.suffix(5), at: 0) }   // keep a few for a retry; never grow unbounded
    }

    private func ingest(_ loc: CLLocation) {
        guard token != nil, loc.timestamp.timeIntervalSince(lastSampleAt) >= 5 else { return }
        lastSampleAt = loc.timestamp
        let az = azBuffer.isEmpty ? 0 : azBuffer.reduce(0, +) / Double(azBuffer.count); azBuffer = []
        samples.append(Sample(t: loc.timestamp, lat: loc.coordinate.latitude, lon: loc.coordinate.longitude, speed: max(0, loc.speed), acc: loc.horizontalAccuracy, heading: max(0, loc.course), az: az))
        if samples.count > Self.windowSamples * 2 { samples.removeFirst(samples.count - Self.windowSamples * 2) }
        let p = currentProbability()
        onProbability?(p)
        if p >= LogisticModel.uploadThreshold, let s = samples.last {
            pending.append(TripPoint(t: s.t, lat: s.lat, lon: s.lon, speed: s.speed, acc: s.acc, pBus: p))
        }
    }

    nonisolated public func locationManager(_ m: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in locations.forEach { self.ingest($0) } }
    }
    nonisolated public func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        let status = m.authorizationStatus
        Task { @MainActor in if status != .notDetermined { self.continuation?.resume(returning: status); self.continuation = nil } }
    }
    nonisolated public func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {}
}
