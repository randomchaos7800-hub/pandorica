import SwiftUI
import AuthenticationServices

struct AuthView: View {
    @EnvironmentObject var authService: AuthService
    @State private var showingCodeInput = false
    @State private var authCode = ""

    var body: some View {
        VStack(spacing: 30) {
            Spacer()

            Text("PANDORICA")
                .font(.system(size: 48, weight: .bold))
                .foregroundColor(.blue)

            Text("Cross-platform markdown notes\nwith Google Drive sync")
                .multilineTextAlignment(.center)
                .foregroundColor(.gray)

            Spacer()

            if !showingCodeInput {
                Button(action: startOAuth) {
                    HStack {
                        Image(systemName: "cloud.fill")
                        Text("Sign in with Google")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .padding(.horizontal, 40)
            } else {
                VStack(spacing: 15) {
                    Text("Paste the authorization code:")
                        .foregroundColor(.gray)

                    TextField("Authorization code", text: $authCode)
                        .textFieldStyle(.roundedBorder)
                        .autocapitalization(.none)
                        .padding(.horizontal, 40)

                    Button(action: completeOAuth) {
                        Text("Complete Sign-In")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                    .padding(.horizontal, 40)
                    .disabled(authCode.isEmpty)
                }
            }

            Spacer()
        }
        .padding()
    }

    func startOAuth() {
        let service = GoogleDriveService()
        let authURL = service.getAuthURL()

        // Open in Safari
        UIApplication.shared.open(authURL)

        showingCodeInput = true
    }

    func completeOAuth() {
        Task {
            do {
                try await authService.signIn(withCode: authCode)
            } catch {
                print("Sign-in failed: \(error)")
            }
        }
    }
}
