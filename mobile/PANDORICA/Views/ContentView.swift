import SwiftUI

struct ContentView: View {
    @EnvironmentObject var syncEngine: SyncEngine
    @State private var selectedFolder: String? = "all"
    @State private var selectedNote: Note?
    @State private var searchText = ""
    @State private var showingSettings = false

    var filteredNotes: [Note] {
        if !searchText.isEmpty {
            return syncEngine.searchNotes(query: searchText)
        }

        if selectedFolder == "all" {
            return syncEngine.notes
        }

        return syncEngine.notes.filter { $0.folderId == selectedFolder }
    }

    var body: some View {
        NavigationView {
            // Folders Sidebar
            FolderListView(selectedFolder: $selectedFolder)

            // Notes List
            NotesListView(
                notes: filteredNotes,
                selectedNote: $selectedNote,
                searchText: $searchText,
                onNewNote: createNote
            )

            // Editor
            if let note = selectedNote {
                NoteEditorView(note: note)
            } else {
                Text("Select a note to edit")
                    .foregroundColor(.gray)
            }
        }
        .navigationViewStyle(.columns)
        .sheet(isPresented: $showingSettings) {
            SettingsView()
        }
    }

    func createNote() {
        let title = "Untitled Note"
        syncEngine.createNote(title: title, folderId: selectedFolder == "all" ? nil : selectedFolder)

        // Select the new note
        if let newNote = syncEngine.notes.last {
            selectedNote = newNote
        }
    }
}

struct FolderListView: View {
    @EnvironmentObject var syncEngine: SyncEngine
    @Binding var selectedFolder: String?

    var body: some View {
        List {
            Button(action: { selectedFolder = "all" }) {
                Label("All Notes", systemImage: "doc.text.fill")
            }
            .listRowBackground(selectedFolder == "all" ? Color.blue.opacity(0.1) : Color.clear)

            Divider()

            ForEach(syncEngine.folders) { folder in
                Button(action: { selectedFolder = folder.id }) {
                    Label(folder.name, systemImage: "folder.fill")
                }
                .listRowBackground(selectedFolder == folder.id ? Color.blue.opacity(0.1) : Color.clear)
            }
        }
        .navigationTitle("PANDORICA")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct NotesListView: View {
    let notes: [Note]
    @Binding var selectedNote: Note?
    @Binding var searchText: String
    let onNewNote: () -> Void

    var body: some View {
        List {
            ForEach(notes) { note in
                Button(action: { selectedNote = note }) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(note.title)
                            .font(.headline)

                        Text(note.preview)
                            .font(.caption)
                            .foregroundColor(.gray)
                            .lineLimit(2)

                        Text(formatDate(note.modifiedTime))
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                    .padding(.vertical, 4)
                }
                .listRowBackground(selectedNote?.id == note.id ? Color.blue.opacity(0.1) : Color.clear)
            }
        }
        .searchable(text: $searchText)
        .navigationTitle("Notes")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: onNewNote) {
                    Image(systemName: "plus")
                }
            }
        }
    }

    func formatDate(_ date: Date) -> String {
        let now = Date()
        let diff = now.timeIntervalSince(date)

        if diff < 60 { return "Just now" }
        if diff < 3600 { return "\(Int(diff / 60)) min ago" }
        if diff < 86400 { return "\(Int(diff / 3600)) hours ago" }
        if diff < 604800 { return "\(Int(diff / 86400)) days ago" }

        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
}
