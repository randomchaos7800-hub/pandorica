import Foundation

struct Note: Identifiable, Codable {
    let id: String
    var name: String
    var content: String
    var modifiedTime: Date
    var md5: String
    var synced: Bool
    var folderId: String?

    var title: String {
        name.replacingOccurrences(of: ".md", with: "")
    }

    var preview: String {
        let lines = content.components(separatedBy: .newlines)
        return lines.first(where: { !$0.isEmpty && !$0.hasPrefix("#") }) ?? ""
    }
}

struct Folder: Identifiable, Codable {
    let id: String
    let name: String
    let type: String
}

struct SyncQueueItem: Codable {
    let id: String
    let action: String // create, update, delete
    let content: String?
    let folderId: String?
    let name: String?
    let tempId: String?
    let timestamp: Date
}

struct Conflict: Identifiable {
    let id: String
    let noteId: String
    let noteName: String
    let localContent: String
    let localTime: Date
    let remoteContent: String
    let remoteTime: Date
    let timestamp: Date
}
