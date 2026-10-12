import Foundation

/// Worker parameters. Each value is explained so it can be read aloud in the video.
public enum EngineConfig {
    /// Privacy floor: a bus is published only if this many distinct trip tokens are companions.
    /// A plain constant (no environment variable, no flag) so it cannot be configured below 3.
    public static let kMin = 3

    public static let windowS = 180.0          // look back this many seconds of points
    public static let gridS = 5.0              // shared resampling grid spacing
    public static let minCoverage = 0.60       // drop tokens with less than 60% of grid points
    public static let pairRadiusM = 200.0      // candidate pairs only within this distance (of mean positions)
    public static let closeM = 40.0            // "together" means within 40 m ...
    public static let closeFraction = 0.80     // ... for at least 80% of grid points
    public static let stopMatchS = 10.0        // stop start/end times must match within +-10 s
    public static let stopMatchFraction = 0.70
    public static let stopSpeedMps = 2.0       // "stopped" threshold on SMOOTHED speed (GPS noise makes 1 m/s too jumpy)
    public static let stopMinS = 8.0, stopMaxS = 90.0
    public static let minStopsToMatch = 1      // a window with no stop events cannot prove "bus": cars/walkers get no bus
    public static let coverageGapS = 10.0      // a grid time counts as covered if a real sample is within this many seconds

    public static let gateM = 150.0            // tracker association gate
    public static let liveS = 60.0, dropS = 300.0
    public static let publicGridM = 50.0       // public positions are rounded to 50 m
    public static let frechetMatchM = 150.0
    public static let minTripsToLearn = 5
}
