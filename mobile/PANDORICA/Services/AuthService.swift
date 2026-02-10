import Foundation
import SwiftUI

class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var userEmail: String?

    private let keychainService = KeychainService.shared
    private var driveService: GoogleDriveService?

    init() {
        checkAuthentication()
    }

    func checkAuthentication() {
        if let tokenJson = keychainService.retrieveToken(),
           let tokenData = tokenJson.data(using: .utf8),
           let tokens = try? JSONDecoder().decode([String: String].self, from: tokenData) {
            driveService = GoogleDriveService(tokens: tokens)
            isAuthenticated = true
        } else {
            isAuthenticated = false
        }
    }

    func signIn(withCode code: String) async throws {
        let service = GoogleDriveService()
        let tokens = try await service.exchangeCodeForTokens(code: code)

        // Store tokens
        let tokenData = try JSONEncoder().encode(tokens)
        let tokenJson = String(data: tokenData, encoding: .utf8)!
        _ = keychainService.storeToken(tokenJson)

        // Update state
        await MainActor.run {
            self.driveService = service
            self.isAuthenticated = true
        }
    }

    func signOut() {
        _ = keychainService.deleteToken()
        driveService = nil
        isAuthenticated = false
        userEmail = nil
    }

    func getDriveService() -> GoogleDriveService? {
        return driveService
    }
}
