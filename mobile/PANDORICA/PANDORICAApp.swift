import SwiftUI

@main
struct PANDORICAApp: App {
    @StateObject private var authService = AuthService()
    @StateObject private var syncEngine = SyncEngine()

    var body: some Scene {
        WindowGroup {
            if authService.isAuthenticated {
                ContentView()
                    .environmentObject(authService)
                    .environmentObject(syncEngine)
                    .onAppear {
                        syncEngine.start()
                    }
            } else {
                AuthView()
                    .environmentObject(authService)
            }
        }
    }
}
