import Foundation

/// A child a parent follows. Stored only on the parent's phone (and the follows table: bus + stop, no name, no location).
public struct Child: Identifiable, Equatable, Codable, Sendable {
    public var id: String
    public var name: String
    public var city: String
    public var school: String
    public var districtCode: String
    public var bus: String
    public var stop: String
    public var walkMin: Int
    public init(id: String = UUID().uuidString, name: String, city: String, school: String, districtCode: String, bus: String, stop: String, walkMin: Int) {
        self.id = id; self.name = name; self.city = city; self.school = school; self.districtCode = districtCode; self.bus = bus; self.stop = stop; self.walkMin = walkMin
    }
}

/// A row of bus_status: one live row per route + stop.
public struct StatusRow: Equatable, Codable, Sendable {
    public var routeLabel: String
    public var stopId: String
    public var stopsAway: Int?
    public var etaMin: Double?
    public var etaLo: Double?
    public var etaHi: Double?
    public var source: BusSource
    public init(routeLabel: String, stopId: String, stopsAway: Int? = nil, etaMin: Double? = nil, etaLo: Double? = nil, etaHi: Double? = nil, source: BusSource) {
        self.routeLabel = routeLabel; self.stopId = stopId; self.stopsAway = stopsAway; self.etaMin = etaMin; self.etaLo = etaLo; self.etaHi = etaHi; self.source = source
    }
    enum CodingKeys: String, CodingKey {
        case routeLabel = "route_label", stopId = "stop_id", stopsAway = "stops_away", etaMin = "eta_min", etaLo = "eta_lo", etaHi = "eta_hi", source
    }
}
