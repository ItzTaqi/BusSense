import Foundation

/// Every key GoNC stores on the phone. Deleting an account removes all of them.
public enum LocalKeys {
    public static let children = "gonc.children.v1"
    public static let appearance = "gonc.appearance.v1"
    public static let terms = "gonc.terms.v1"
    public static let alertPrefs = "gonc.alertprefs.v1"
    public static let rides = "gonc.rides.v1"
    public static let riderName = "gonc.ridername.v1"
    public static let all: [String] = [children, appearance, terms, alertPrefs, rides, riderName]
}
