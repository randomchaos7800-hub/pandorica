# PANDORICA - Cross-Platform Markdown Notes

A cross-platform markdown notes application with Google Drive sync. Replace Obsidian, own your infrastructure.

## Platforms

- **Desktop**: Mac and Windows (Electron)
- **Mobile**: iOS and iPad (Native Swift/SwiftUI)
- **Sync**: Google Drive API v3
- **Claude Code Integration**: Desktop platforms

## Features

- ✅ Markdown editing with live preview
- ✅ Google Drive sync (OAuth 2.0)
- ✅ Offline mode with sync queue
- ✅ Full-text search
- ✅ Folder organization
- ✅ Conflict detection with user resolution
- ✅ Claude Code filesystem integration
- ✅ Cross-platform consistency

## Installation

### Prerequisites

**Desktop:**
- Node.js 18+ and npm
- Git

**Mobile:**
- macOS with Xcode 14+
- Apple Developer account (for device installation)

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials:
   - Application type: Desktop app (for Electron)
   - Application type: iOS (for mobile)
5. Note your Client ID and Client Secret
6. Add authorized redirect URIs:
   - Desktop: `http://localhost:3000/oauth2callback`
   - iOS: `com.googleusercontent.apps.YOUR_CLIENT_ID:/oauthredirect`

### Desktop Installation

```bash
cd desktop
npm install

# Configure OAuth
# Edit src/shared/googleDriveService.js
# Replace CLIENT_ID and CLIENT_SECRET with your values

# Run
npm start

# Build
npm run build:mac    # Mac
npm run build:win    # Windows
```

**Installation locations after build:**
- Mac: `desktop/dist/mac/PANDORICA.app`
- Windows: `desktop/dist/win-unpacked/PANDORICA.exe`

### Mobile Installation

```bash
cd mobile

# Open in Xcode
open PANDORICA.xcodeproj
```

**Configure OAuth:**
1. Edit `PANDORICA/Services/GoogleDriveService.swift`
2. Replace `CLIENT_ID` and `CLIENT_SECRET`
3. Update `redirectUri` with your app's custom URL scheme

**Build & Install:**
1. Connect your iPhone/iPad
2. Select your device as build target
3. Configure signing (use your Apple Developer account)
4. Build and run (Cmd+R)

**For iPad:**
- Same process, select iPad as target
- App supports Split View and Slide Over

## Usage

### First Run

1. Launch PANDORICA
2. Click "Sign in with Google"
3. Authorize in browser
4. Copy authorization code
5. Paste code in app
6. App creates `Google Drive/PANDORICA/` folder structure

### Creating Notes

- Click "+ New Note" or press Cmd/Ctrl+N
- Notes auto-save as you type
- Syncs automatically every 30 seconds

### Folders

Default folders:
- `daily/` - Daily notes
- `specs/` - Specifications
- `bugs/` - Bug reports
- `ideas/` - Ideas and brainstorming
- `archive/` - Archived notes

Create custom folders with "+ New Folder" button.

### Search

- Press Cmd/Ctrl+P for quick switcher
- Type to search across all notes
- Click result to open note

### Editor Modes

**Desktop:**
- Edit: Markdown editor only
- Preview: Rendered HTML only
- Split: Editor and preview side-by-side

**Mobile:**
- Toggle between edit and preview with eye icon

### Offline Mode

- Create/edit notes offline
- Changes queue automatically
- Sync when back online
- Conflicts resolved with user choice

## Claude Code Integration

### Desktop File Paths

**Mac:**
```
~/Library/Application Support/PANDORICA-1.0/notes/
```

**Windows:**
```
%APPDATA%\PANDORICA-1.0\notes\
```

### Example Usage

```python
# Read a note
import os

notes_path = os.path.expanduser("~/Library/Application Support/PANDORICA-1.0/notes/")
with open(os.path.join(notes_path, "my-note.md"), "r") as f:
    content = f.read()

# Write a note
with open(os.path.join(notes_path, "new-note.md"), "w") as f:
    f.write("# New Note\n\nContent here")
```

**Note:** Mobile notes are in app sandbox, not directly accessible to Claude Code.

## Architecture

### Desktop (Electron)

```
desktop/
├── src/
│   ├── main/           # Main process (Node.js)
│   │   └── main.js     # App lifecycle, IPC handlers
│   ├── renderer/       # Renderer process (UI)
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── renderer.js
│   └── shared/         # Shared services
│       ├── googleDriveService.js   # Drive API
│       ├── keychainService.js      # Keychain/Credential Manager
│       └── syncEngine.js           # Sync logic
└── package.json
```

### Mobile (Swift/SwiftUI)

```
mobile/PANDORICA/
├── PANDORICAApp.swift              # App entry point
├── Models/
│   └── Note.swift                  # Data models
├── Services/
│   ├── AuthService.swift           # OAuth flow
│   ├── GoogleDriveService.swift    # Drive API
│   ├── KeychainService.swift       # Keychain storage
│   └── SyncEngine.swift            # Sync logic
└── Views/
    ├── AuthView.swift              # Sign-in screen
    ├── ContentView.swift           # Main app
    └── NoteEditorView.swift        # Editor/preview
```

### Sync Architecture

**Conflict Resolution:**
- MD5 hash comparison for change detection
- Server timestamp validation (clock drift protection)
- Last-write-wins with user notification for conflicts
- Conflict UI shows both versions, user chooses

**Offline Queue:**
- Changes queue locally when offline
- Auto-sync when connection restored
- Serialized sync (no race conditions)

**File Structure on Google Drive:**
```
Google Drive/
└── PANDORICA/
    ├── daily/
    │   └── 2026-02-09.md
    ├── specs/
    ├── bugs/
    ├── ideas/
    └── archive/
```

## Testing

### Desktop

```bash
cd desktop

# Manual testing checklist
# 1. Create note → Appears in Google Drive
# 2. Edit note → Syncs to Drive
# 3. Create note on Drive web → Appears in app
# 4. Edit same note on two devices offline → Conflict resolution
# 5. Delete note → Removed from Drive
# 6. Go offline → Queue changes → Online → Sync
# 7. Search notes → Results appear
# 8. Claude Code can read/write notes
```

### Mobile

```bash
# Manual testing checklist
# 1. Sign in with Google
# 2. Create note on iPhone → Appears on iPad
# 3. Edit note on iPad → Syncs to iPhone
# 4. Offline edit → Sync when online
# 5. Search works
# 6. Share sheet integration
# 7. Keyboard shortcuts (iPad)
```

### Cross-Platform

```bash
# Critical test scenarios
# 1. Create on Mac → Appears on Windows, iOS, iPad
# 2. Edit on Windows → Appears on all devices
# 3. Delete on iPad → Removed everywhere
# 4. Simultaneous offline edits → Conflict handled
# 5. Large file (>1MB) → Syncs correctly
```

## Troubleshooting

### "OAuth failed"

- Check Client ID and Client Secret are correct
- Verify redirect URI matches exactly
- Ensure Google Drive API is enabled in Cloud Console

### "Sync error"

- Check internet connection
- Verify Google Drive quota not exceeded
- Check token hasn't been revoked in Google account

### "Keychain access denied"

- Desktop: Grant keychain permissions in system settings
- iOS: App uses secure enclave, no action needed

### "Clock drift warning"

- Sync uses server time as source of truth
- Local clock differences won't cause data loss
- Conflicts still detected correctly

## Performance

- App launch: <2 seconds
- File switching: Instant
- Search: Live results while typing
- Sync: Background, non-blocking

## Security

- OAuth 2.0 only (no password storage)
- Tokens in system keychain
- All data in user's Google Drive
- No telemetry or analytics
- No data sent anywhere except Google Drive

## Budget Savings

- Obsidian Sync: $10/month = $120/year
- PANDORICA: $0/month (one-time build)
- Savings redirected to Mike's API budget (~40M Haiku tokens/year)

## License

Built with Swarm Kit for personal use. All code included.

## Support

This is a personal infrastructure project. No official support, but:
- Source code is fully documented
- Architecture is straightforward
- Google Drive API is well-documented
- Common issues covered in Troubleshooting

## Future Enhancements (Out of MVP Scope)

- Wiki-style links `[[note]]`
- Tags and filtering
- Graph view
- Export to PDF/HTML
- End-to-end encryption
- Alternative sync backends
- Vim keybindings
- Plugins

---

Built with **Swarm Kit v4.0 (molly)**

**Project Type:** Infrastructure (replaces Obsidian)
**Status:** Production-ready MVP
**Version:** 1.0.0
**Last Updated:** 2026-02-09
