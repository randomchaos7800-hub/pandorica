import Foundation
import Combine
import CryptoKit

class SyncEngine: ObservableObject {
    @Published var syncStatus: SyncStatus = .idle
    @Published var notes: [Note] = []
    @Published var folders: [Folder] = []

    private var driveService: GoogleDriveService?
    private var syncTimer: Timer?
    private var pandoricaFolderId: String?
    private var folderStructure: [String: Folder] = [:]

    enum SyncStatus {
        case idle, syncing, synced, saving, error, offline
    }

    func start() {
        // Load from UserDefaults
        loadLocalData()

        // Start sync
        Task {
            await syncNow()
        }

        // Poll every 30 seconds
        syncTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            Task {
                await self?.syncNow()
            }
        }
    }

    func stop() {
        syncTimer?.invalidate()
        syncTimer = nil
    }

    func syncNow() async {
        await MainActor.run {
            syncStatus = .syncing
        }

        do {
            try await pullFromDrive()
            try await pushToDrive()

            await MainActor.run {
                syncStatus = .synced
            }
        } catch {
            print("Sync failed: \(error)")
            await MainActor.run {
                syncStatus = .error
            }
        }
    }

    func initializeGoogleDriveStructure(driveService: GoogleDriveService) async throws {
        self.driveService = driveService

        // Create PANDORICA root folder
        let pandoricaFolder = try await driveService.findOrCreateFolder(name: "PANDORICA")
        self.pandoricaFolderId = pandoricaFolder.id

        // Create subfolders
        let subfolders = ["daily", "specs", "bugs", "ideas", "archive"]
        for folderName in subfolders {
            let folder = try await driveService.findOrCreateFolder(name: folderName, parentId: pandoricaFolder.id)
            folderStructure[folder.id] = folder
        }

        await MainActor.run {
            self.folders = Array(folderStructure.values)
        }

        saveLocalData()
    }

    private func pullFromDrive() async throws {
        guard let driveService = driveService else { return }
        guard let pandoricaFolderId = pandoricaFolderId else { return }

        let driveFiles = try await driveService.listFiles(folderId: pandoricaFolderId)

        var updatedNotes = notes

        for driveFile in driveFiles {
            if driveFile.mimeType == "application/vnd.google-apps.folder" {
                // Update folder structure
                if folderStructure[driveFile.id] == nil {
                    folderStructure[driveFile.id] = Folder(
                        id: driveFile.id,
                        name: driveFile.name,
                        type: "folder"
                    )
                }
                continue
            }

            // It's a file
            if let existingIndex = updatedNotes.firstIndex(where: { $0.id == driveFile.id }) {
                let localNote = updatedNotes[existingIndex]

                // Check for conflicts
                if driveFile.md5Checksum != localNote.md5 {
                    let content = try await driveService.getFileContent(fileId: driveFile.id)
                    updatedNotes[existingIndex] = Note(
                        id: driveFile.id,
                        name: driveFile.name,
                        content: content,
                        modifiedTime: ISO8601DateFormatter().date(from: driveFile.modifiedTime ?? "") ?? Date(),
                        md5: driveFile.md5Checksum ?? "",
                        synced: true,
                        folderId: nil
                    )
                }
            } else {
                // New file on Drive
                let content = try await driveService.getFileContent(fileId: driveFile.id)
                updatedNotes.append(Note(
                    id: driveFile.id,
                    name: driveFile.name,
                    content: content,
                    modifiedTime: ISO8601DateFormatter().date(from: driveFile.modifiedTime ?? "") ?? Date(),
                    md5: driveFile.md5Checksum ?? "",
                    synced: true,
                    folderId: nil
                ))
            }
        }

        // Check for deleted files
        updatedNotes.removeAll { note in
            !driveFiles.contains { $0.id == note.id } && note.synced
        }

        await MainActor.run {
            self.notes = updatedNotes
            self.folders = Array(folderStructure.values)
        }

        saveLocalData()
    }

    private func pushToDrive() async throws {
        guard let driveService = driveService else { return }

        let unsyncedNotes = notes.filter { !$0.synced }

        for note in unsyncedNotes {
            if note.id.hasPrefix("temp-") {
                // Create new file
                let fileData = try await driveService.createFile(
                    name: note.name,
                    content: note.content,
                    parentId: note.folderId ?? pandoricaFolderId!
                )

                // Update local note
                if let index = notes.firstIndex(where: { $0.id == note.id }) {
                    await MainActor.run {
                        notes[index] = Note(
                            id: fileData.id,
                            name: note.name,
                            content: note.content,
                            modifiedTime: ISO8601DateFormatter().date(from: fileData.modifiedTime ?? "") ?? Date(),
                            md5: fileData.md5Checksum ?? "",
                            synced: true,
                            folderId: note.folderId
                        )
                    }
                }
            } else {
                // Update existing file
                let fileData = try await driveService.updateFile(fileId: note.id, content: note.content)

                if let index = notes.firstIndex(where: { $0.id == note.id }) {
                    await MainActor.run {
                        notes[index].md5 = fileData.md5Checksum ?? ""
                        notes[index].modifiedTime = ISO8601DateFormatter().date(from: fileData.modifiedTime ?? "") ?? Date()
                        notes[index].synced = true
                    }
                }
            }
        }

        saveLocalData()
    }

    // CRUD Operations
    func createNote(title: String, folderId: String?) {
        let tempId = "temp-" + UUID().uuidString
        let content = "# \(title)\n\n"
        let note = Note(
            id: tempId,
            name: "\(title).md",
            content: content,
            modifiedTime: Date(),
            md5: md5Hash(content),
            synced: false,
            folderId: folderId ?? pandoricaFolderId
        )

        notes.append(note)
        saveLocalData()

        Task {
            await syncNow()
        }
    }

    func saveNote(_ note: Note, content: String) {
        if let index = notes.firstIndex(where: { $0.id == note.id }) {
            notes[index].content = content
            notes[index].modifiedTime = Date()
            notes[index].md5 = md5Hash(content)
            notes[index].synced = false

            saveLocalData()

            Task {
                try? await Task.sleep(nanoseconds: 500_000_000) // 500ms debounce
                await syncNow()
            }
        }
    }

    func deleteNote(_ note: Note) {
        notes.removeAll { $0.id == note.id }
        saveLocalData()

        if let driveService = driveService, !note.id.hasPrefix("temp-") {
            Task {
                try? await driveService.deleteFile(fileId: note.id)
            }
        }
    }

    func searchNotes(query: String) -> [Note] {
        let lowercaseQuery = query.lowercased()
        return notes.filter { note in
            note.name.lowercased().contains(lowercaseQuery) ||
            note.content.lowercased().contains(lowercaseQuery)
        }
    }

    // Persistence
    private func saveLocalData() {
        if let notesData = try? JSONEncoder().encode(notes) {
            UserDefaults.standard.set(notesData, forKey: "notes")
        }

        if let foldersData = try? JSONEncoder().encode(folders) {
            UserDefaults.standard.set(foldersData, forKey: "folders")
        }

        if let pandoricaId = pandoricaFolderId {
            UserDefaults.standard.set(pandoricaId, forKey: "pandoricaFolderId")
        }
    }

    private func loadLocalData() {
        if let notesData = UserDefaults.standard.data(forKey: "notes"),
           let decodedNotes = try? JSONDecoder().decode([Note].self, from: notesData) {
            notes = decodedNotes
        }

        if let foldersData = UserDefaults.standard.data(forKey: "folders"),
           let decodedFolders = try? JSONDecoder().decode([Folder].self, from: foldersData) {
            folders = decodedFolders
            folderStructure = Dictionary(uniqueKeysWithValues: decodedFolders.map { ($0.id, $0) })
        }

        pandoricaFolderId = UserDefaults.standard.string(forKey: "pandoricaFolderId")
    }

    // Utility
    private func md5Hash(_ string: String) -> String {
        let data = Data(string.utf8)
        let hash = Insecure.MD5.hash(data: data)
        return hash.map { String(format: "%02hhx", $0) }.joined()
    }
}
