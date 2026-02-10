import Foundation

class GoogleDriveService {
    private let clientId = "YOUR_CLIENT_ID.apps.googleusercontent.com"
    private let clientSecret = "YOUR_CLIENT_SECRET"
    private let redirectUri = "com.googleusercontent.apps.YOUR_CLIENT_ID:/oauthredirect"
    private let scopes = [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.appdata"
    ]

    private var accessToken: String?
    private var refreshToken: String?

    init(tokens: [String: String]? = nil) {
        if let tokens = tokens {
            self.accessToken = tokens["access_token"]
            self.refreshToken = tokens["refresh_token"]
        }
    }

    func getAuthURL() -> URL {
        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "redirect_uri", value: redirectUri),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: scopes.joined(separator: " ")),
            URLQueryItem(name: "access_type", value: "offline"),
            URLQueryItem(name: "prompt", value: "consent")
        ]
        return components.url!
    }

    func exchangeCodeForTokens(code: String) async throws -> [String: String] {
        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "code": code,
            "client_id": clientId,
            "client_secret": clientSecret,
            "redirect_uri": redirectUri,
            "grant_type": "authorization_code"
        ]

        request.httpBody = body.percentEncoded()

        let (data, _) = try await URLSession.shared.data(for: request)
        let tokens = try JSONDecoder().decode([String: String].self, from: data)

        self.accessToken = tokens["access_token"]
        self.refreshToken = tokens["refresh_token"]

        return tokens
    }

    func refreshAccessToken() async throws {
        guard let refreshToken = refreshToken else {
            throw NSError(domain: "GoogleDrive", code: -1, userInfo: [NSLocalizedDescriptionKey: "No refresh token"])
        }

        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "refresh_token": refreshToken,
            "client_id": clientId,
            "client_secret": clientSecret,
            "grant_type": "refresh_token"
        ]

        request.httpBody = body.percentEncoded()

        let (data, _) = try await URLSession.shared.data(for: request)
        let tokens = try JSONDecoder().decode([String: String].self, from: data)

        self.accessToken = tokens["access_token"]
    }

    // Drive API Methods
    func findOrCreateFolder(name: String, parentId: String? = nil) async throws -> Folder {
        // Search for existing folder
        let query = parentId != nil
            ? "name='\(name)' and '\(parentId!)' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
            : "name='\(name)' and mimeType='application/vnd.google-apps.folder' and trashed=false"

        let searchURL = URL(string: "https://www.googleapis.com/drive/v3/files?q=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)&fields=files(id,name)")!

        var request = URLRequest(url: searchURL)
        request.setValue("Bearer \(accessToken!)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(FileListResponse.self, from: data)

        if let existing = response.files.first {
            return Folder(id: existing.id, name: existing.name, type: "folder")
        }

        // Create folder
        let createURL = URL(string: "https://www.googleapis.com/drive/v3/files?fields=id,name")!
        var createRequest = URLRequest(url: createURL)
        createRequest.httpMethod = "POST"
        createRequest.setValue("Bearer \(accessToken!)", forHTTPHeaderField: "Authorization")
        createRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let metadata: [String: Any] = [
            "name": name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": parentId != nil ? [parentId!] : []
        ]

        createRequest.httpBody = try JSONSerialization.data(withJSONObject: metadata)

        let (createData, _) = try await URLSession.shared.data(for: createRequest)
        let file = try JSONDecoder().decode(FileMetadata.self, from: createData)

        return Folder(id: file.id, name: file.name, type: "folder")
    }

    func listFiles(folderId: String) async throws -> [FileMetadata] {
        let query = "'\(folderId)' in parents and trashed=false"
        let url = URL(string: "https://www.googleapis.com/drive/v3/files?q=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)&fields=files(id,name,mimeType,modifiedTime,md5Checksum)&pageSize=1000")!

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken!)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(FileListResponse.self, from: data)

        return response.files
    }

    func getFileContent(fileId: String) async throws -> String {
        let url = URL(string: "https://www.googleapis.com/drive/v3/files/\(fileId)?alt=media")!

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken!)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return String(data: data, encoding: .utf8) ?? ""
    }

    func createFile(name: String, content: String, parentId: String) async throws -> FileMetadata {
        let boundary = UUID().uuidString
        let url = URL(string: "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,md5Checksum")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken!)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/related; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        let metadata: [String: Any] = [
            "name": name,
            "mimeType": "text/markdown",
            "parents": [parentId]
        ]

        let metadataData = try JSONSerialization.data(withJSONObject: metadata)
        let contentData = content.data(using: .utf8)!

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/json; charset=UTF-8\r\n\r\n".data(using: .utf8)!)
        body.append(metadataData)
        body.append("\r\n--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Type: text/markdown\r\n\r\n".data(using: .utf8)!)
        body.append(contentData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(FileMetadata.self, from: data)
    }

    func updateFile(fileId: String, content: String) async throws -> FileMetadata {
        let url = URL(string: "https://www.googleapis.com/upload/drive/v3/files/\(fileId)?uploadType=media&fields=id,name,modifiedTime,md5Checksum")!

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(accessToken!)", forHTTPHeaderField: "Authorization")
        request.setValue("text/markdown", forHTTPHeaderField: "Content-Type")
        request.httpBody = content.data(using: .utf8)

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(FileMetadata.self, from: data)
    }

    func deleteFile(fileId: String) async throws {
        let url = URL(string: "https://www.googleapis.com/drive/v3/files/\(fileId)")!

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(accessToken!)", forHTTPHeaderField: "Authorization")

        _ = try await URLSession.shared.data(for: request)
    }
}

// Response Models
struct FileListResponse: Decodable {
    let files: [FileMetadata]
}

struct FileMetadata: Decodable {
    let id: String
    let name: String
    let mimeType: String?
    let modifiedTime: String?
    let md5Checksum: String?
}

// Helper Extension
extension Dictionary {
    func percentEncoded() -> Data? {
        return map { key, value in
            let escapedKey = "\(key)".addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed) ?? ""
            let escapedValue = "\(value)".addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed) ?? ""
            return escapedKey + "=" + escapedValue
        }
        .joined(separator: "&")
        .data(using: .utf8)
    }
}

extension CharacterSet {
    static let urlQueryValueAllowed: CharacterSet = {
        let generalDelimitersToEncode = ":#[]@"
        let subDelimitersToEncode = "!$&'()*+,;="

        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "\(generalDelimitersToEncode)\(subDelimitersToEncode)")
        return allowed
    }()
}
