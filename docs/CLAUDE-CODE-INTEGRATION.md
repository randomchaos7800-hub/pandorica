# Claude Code Integration Guide

PANDORICA is designed for programmatic note management via Claude Code on desktop platforms.

## File Locations

### macOS

```bash
~/Library/Application Support/PANDORICA-1.0/notes/
```

**Full path:**
```
/Users/USERNAME/Library/Application Support/PANDORICA-1.0/notes/
```

### Windows

```bash
%APPDATA%\PANDORICA-1.0\notes\
```

**Full path:**
```
C:\Users\USERNAME\AppData\Roaming\PANDORICA-1.0\notes\
```

## File Structure

All notes are standard `.md` markdown files:

```
notes/
├── daily/
│   └── 2026-02-09.md
├── specs/
│   └── pandorica-spec.md
├── bugs/
│   └── auth-flow-issue.md
├── ideas/
│   └── future-features.md
└── archive/
    └── old-note.md
```

## Usage Examples

### Python

```python
import os
from pathlib import Path

# Get notes directory
if os.name == 'nt':  # Windows
    notes_dir = Path(os.getenv('APPDATA')) / 'PANDORICA-1.0' / 'notes'
else:  # macOS
    notes_dir = Path.home() / 'Library' / 'Application Support' / 'PANDORICA-1.0' / 'notes'

# Read a note
note_path = notes_dir / 'daily' / '2026-02-09.md'
if note_path.exists():
    content = note_path.read_text()
    print(content)

# Write a note
new_note = notes_dir / 'ideas' / 'new-idea.md'
new_note.write_text("# New Idea\n\nSome content here")

# List all notes
for note in notes_dir.rglob('*.md'):
    print(note.relative_to(notes_dir))

# Search notes
def search_notes(query):
    results = []
    for note_file in notes_dir.rglob('*.md'):
        content = note_file.read_text()
        if query.lower() in content.lower():
            results.append(note_file)
    return results

matches = search_notes("mike's architecture")
```

### JavaScript

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get notes directory
let notesDir;
if (os.platform() === 'win32') {
    notesDir = path.join(process.env.APPDATA, 'PANDORICA-1.0', 'notes');
} else {
    notesDir = path.join(os.homedir(), 'Library', 'Application Support', 'PANDORICA-1.0', 'notes');
}

// Read a note
const notePath = path.join(notesDir, 'daily', '2026-02-09.md');
if (fs.existsSync(notePath)) {
    const content = fs.readFileSync(notePath, 'utf8');
    console.log(content);
}

// Write a note
const newNote = path.join(notesDir, 'ideas', 'new-idea.md');
fs.writeFileSync(newNote, '# New Idea\n\nSome content here');

// List all notes
function listNotes(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files.push(...listNotes(fullPath));
        } else if (item.name.endsWith('.md')) {
            files.push(fullPath);
        }
    }

    return files;
}

const allNotes = listNotes(notesDir);
```

### Bash

```bash
# macOS
NOTES_DIR="$HOME/Library/Application Support/PANDORICA-1.0/notes"

# Windows (Git Bash)
# NOTES_DIR="$APPDATA/PANDORICA-1.0/notes"

# Read a note
cat "$NOTES_DIR/daily/2026-02-09.md"

# Create a note
cat > "$NOTES_DIR/ideas/new-idea.md" << EOF
# New Idea

Some content here
EOF

# List all notes
find "$NOTES_DIR" -name "*.md"

# Search notes
grep -r "mike's architecture" "$NOTES_DIR"
```

## Claude Code Examples

### Example 1: Daily Standup

```
User: "Read my notes on today's standup"

Claude Code:
1. Determines today's date: 2026-02-09
2. Reads ~/Library/Application Support/PANDORICA-1.0/notes/daily/2026-02-09.md
3. Presents content

User: "Add that I shipped the login flow"

Claude Code:
1. Appends "- Shipped login flow" to the note
2. Saves file
3. PANDORICA auto-syncs to Google Drive
```

### Example 2: Spec Synthesis

```
User: "Synthesize the PANDORICA spec and architecture notes into a summary"

Claude Code:
1. Reads notes/specs/pandorica-spec.md
2. Reads notes/specs/architecture-decisions.md
3. Creates summary
4. Writes to notes/specs/summary.md
5. PANDORICA auto-syncs
```

### Example 3: Bug Triage

```
User: "List all open bugs"

Claude Code:
1. Reads all .md files in notes/bugs/
2. Filters for status: open
3. Presents list with links

User: "Create a bug for the auth flow timeout"

Claude Code:
1. Creates notes/bugs/auth-timeout.md with template
2. PANDORICA auto-syncs
```

## Sync Behavior

**Important:** When Claude Code writes files, PANDORICA will:
1. Detect the file change within 30 seconds (polling interval)
2. Queue the change for sync
3. Upload to Google Drive
4. Sync to other devices

**Recommendation:** After Claude Code creates/modifies notes:
- Wait ~1 minute for sync to complete
- Check other devices to verify sync
- Manual sync available via settings panel

## File Watching (Advanced)

PANDORICA polls for changes every 30 seconds. For instant sync:

```python
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class NoteHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith('.md'):
            print(f"Note modified: {event.src_path}")
            # Trigger manual sync in PANDORICA if needed

observer = Observer()
observer.schedule(NoteHandler(), notes_dir, recursive=True)
observer.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()
observer.join()
```

## Best Practices

1. **Use standard markdown** - PANDORICA renders CommonMark
2. **Organize by folder** - Use daily/, specs/, bugs/, ideas/, archive/
3. **Name files clearly** - `2026-02-09-standup.md` not `note1.md`
4. **Wait for sync** - Give PANDORICA ~1 minute after writes
5. **Check conflicts** - If editing same note on multiple devices

## Limitations

- **Mobile notes not accessible** - iOS/iPad notes are in app sandbox
- **Desktop only** - Claude Code integration works on Mac/Windows only
- **30-second poll** - Changes detected within 30 seconds, not instant
- **No file locking** - Multiple writers can create conflicts

## Troubleshooting

**"File not found"**
- Verify PANDORICA is running and signed in
- Check notes directory exists
- On first run, PANDORICA creates structure

**"Changes not syncing"**
- Check PANDORICA sync status (header bar)
- Manual sync via settings panel
- Verify Google Drive quota not exceeded

**"Conflict detected"**
- PANDORICA will show conflict UI
- Choose which version to keep
- Or manually merge in editor

---

Built for seamless Claude Code integration. Your notes, your code, your control.
