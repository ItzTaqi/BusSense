import Foundation
import UserNotifications

public enum NotificationPermission: Equatable, Sendable { case granted, denied, notAsked, unavailable }

/// Notification permission. (Registering for remote push and sending a token to the server needs an Apple Developer account
/// and the Push Notifications capability; the permission prompt works without them.)
public enum NotificationService {
    private static var available: Bool { Bundle.main.bundleIdentifier != nil }   // false in command-line tools
    public static func status() async -> NotificationPermission {
        guard available else { return .unavailable }
        switch await UNUserNotificationCenter.current().notificationSettings().authorizationStatus {
        case .authorized, .provisional, .ephemeral: return .granted
        case .denied: return .denied
        default: return .notAsked
        }
    }
    @discardableResult public static func request() async -> NotificationPermission {
        guard available else { return .unavailable }
        let ok = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        return ok ? .granted : .denied
    }
}
