import SwiftUI

struct NoteEditorView: View {
    @EnvironmentObject var syncEngine: SyncEngine
    let note: Note

    @State private var content: String
    @State private var isPreviewMode = false

    init(note: Note) {
        self.note = note
        _content = State(initialValue: note.content)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            HStack {
                Button(action: { isPreviewMode.toggle() }) {
                    Image(systemName: isPreviewMode ? "doc.text" : "eye")
                }

                Spacer()

                Text(syncEngine.syncStatus == .syncing ? "Syncing..." : "Saved")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .padding()
            .background(Color(.systemGray6))

            // Editor or Preview
            if isPreviewMode {
                MarkdownPreview(markdown: content)
            } else {
                TextEditor(text: $content)
                    .font(.system(.body, design: .monospaced))
                    .padding()
                    .onChange(of: content) { newValue in
                        saveNote(content: newValue)
                    }
            }
        }
        .navigationTitle(note.title)
        .navigationBarTitleDisplayMode(.inline)
    }

    func saveNote(content: String) {
        syncEngine.saveNote(note, content: content)
    }
}

struct MarkdownPreview: View {
    let markdown: String

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                ForEach(parseMarkdown(), id: \.self) { line in
                    markdownLine(line)
                }
            }
            .padding()
        }
    }

    func parseMarkdown() -> [String] {
        markdown.components(separatedBy: .newlines)
    }

    func markdownLine(_ line: String) -> some View {
        Group {
            if line.hasPrefix("# ") {
                Text(line.replacingOccurrences(of: "# ", with: ""))
                    .font(.largeTitle)
                    .bold()
            } else if line.hasPrefix("## ") {
                Text(line.replacingOccurrences(of: "## ", with: ""))
                    .font(.title)
                    .bold()
            } else if line.hasPrefix("### ") {
                Text(line.replacingOccurrences(of: "### ", with: ""))
                    .font(.title2)
                    .bold()
            } else if line.hasPrefix("- ") {
                HStack(alignment: .top) {
                    Text("•")
                    Text(line.replacingOccurrences(of: "- ", with: ""))
                }
            } else if !line.isEmpty {
                Text(line)
            }
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var authService: AuthService
    @EnvironmentObject var syncEngine: SyncEngine
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            Form {
                Section("Account") {
                    Text(authService.userEmail ?? "Unknown")

                    Button("Sign Out", role: .destructive) {
                        authService.signOut()
                        dismiss()
                    }
                }

                Section("Sync") {
                    Button("Sync Now") {
                        Task {
                            await syncEngine.syncNow()
                        }
                    }
                }

                Section("Storage") {
                    Text("\(syncEngine.notes.count) notes")
                }

                Section("About") {
                    Text("PANDORICA v1.0")
                    Text("Built with Swarm Kit")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}
