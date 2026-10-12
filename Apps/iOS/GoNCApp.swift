// Copy this file into a new iOS App target in Xcode (File > New > Project > iOS > App, SwiftUI), delete the template
// ContentView/App files, then add the GoNC package (File > Add Package Dependencies > Add Local... > this repo's folder)
// and link the "GoNCUI" product. Not compiled by `swift build` (it needs the iOS SDK from Xcode).
import SwiftUI
import UIKit
import GoNCUI

/// Receives the APNs device token and hands it to the app so alerts can reach this phone.
final class AppDelegate: NSObject, UIApplicationDelegate {
    static var onToken: ((String) -> Void)?
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Self.onToken?(deviceToken.map { String(format: "%02x", $0) }.joined())
    }
}

@main
struct GoNCApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            GoNCRootView(model: model)
                .onAppear {
                    AppDelegate.onToken = { model.registerPushToken($0) }
                    NotificationService.onGranted = { UIApplication.shared.registerForRemoteNotifications() }
                }
        }
    }
}
