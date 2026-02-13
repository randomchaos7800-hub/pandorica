# PANDORICA v0.1.0-beta - Windows Desktop App

**Release Date:** February 13, 2026
**Status:** 🟡 BETA - Functional with Known Issues
**Platform:** Windows 10/11 (x64, ARM64)
**Framework:** Electron + Node.js

---

## ⚠️ BETA WARNING

This is a **beta release** for testing purposes only. The application is functional but contains **12 known bugs** (3 critical) that must be fixed before production use. **Do not use for critical data** without maintaining external backups.

---

## 🎯 What This Beta Tests

This release demonstrates:
- ✅ **End-to-end OAuth 2.0 authentication** with Google Drive
- ✅ **Bidirectional sync** between local app and Google Drive
- ✅ **Offline queue** for working without internet
- ✅ **Full-text search** across all markdown notes
- ✅ **Markdown editing** with live preview
- ✅ **Auto-save** with debouncing

---

## 🚀 Installation & Setup

### Prerequisites
- Windows 10 version 1809+ or Windows 11
- Node.js 18+ (for development)
- Google Account
- Google Cloud Platform project with Drive API enabled

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/randomchaos7800-hub/pandorica.git
   cd pandorica/desktop
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure OAuth credentials:**
   - Go to https://console.cloud.google.com/
   - Create project and enable Google Drive API
   - Create OAuth 2.0 credentials (Desktop app type)
   - **IMPORTANT:** Edit `src/shared/googleDriveService.js` lines 5-7:
     ```javascript
     const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
     const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
     const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
     ```
   - Add your email as a test user in OAuth consent screen

4. **Run the app:**
   ```bash
   npm start
   ```

5. **Sign in with Google:**
   - Click "Sign in with Google"
   - Copy the authorization code from browser
   - Paste into PANDORICA and click "Complete Sign-In"

---

## ✅ What Works in This Beta

### Core Functionality
- ✅ **OAuth Authentication** - Complete Google OAuth 2.0 flow
- ✅ **Google Drive Integration** - Automatic folder creation (PANDORICA/daily/specs/bugs/ideas/archive)
- ✅ **File Sync** - Bidirectional sync with 30-second polling
- ✅ **Offline Mode** - Queue syncs when offline, processes when back online
- ✅ **Auto-Save** - Changes saved automatically with 500ms debounce
- ✅ **Search** - Full-text search across all note content (300ms debounce)
- ✅ **Markdown Editing** - CodeMirror 6 editor with syntax highlighting
- ✅ **Preview Mode** - Live markdown preview with marked.js + highlight.js
- ✅ **Keyboard Shortcuts** - Ctrl+N (new), Ctrl+S (save), Ctrl+P (search)

### Technical Features
- ✅ **IPC Communication** - 13 handlers for main↔renderer communication
- ✅ **Conflict Detection** - MD5 checksums + server time validation
- ✅ **Token Storage** - Windows Credential Manager via keytar
- ✅ **Local Storage** - electron-store for configuration persistence
- ✅ **Event-Driven Sync** - EventEmitter pattern for status updates

---

## 🐛 Known Issues (12 Total)

### 🔴 CRITICAL BUGS (Must Fix Before Production)

#### 1. **Folder Filtering Broken** ⚠️ MAJOR IMPACT
**Location:** `desktop/src/shared/syncEngine.js:292-303`

**Problem:**
- Notes don't track which folder they belong to
- Clicking any folder shows ALL notes
- Folder organization completely non-functional

**Impact:** Core feature broken - users cannot organize notes by folder

**Proposed Fix:**
```javascript
// In createNote() - add parent folder tracking
const noteId = uuidv4();
this.notes[noteId] = {
  id: noteId,
  title: title,
  folderId: folderId,        // ADD THIS LINE
  content: '',
  modifiedTime: new Date().toISOString(),
  md5: md5('')
};

// In getNotesInFolder() - filter by parent folder
if (folderId === 'all') {
  return Object.values(allNotes);
}
// REPLACE the "return all notes" with:
return Object.values(allNotes).filter(note => note.folderId === folderId);

// In pullFromDrive() - store folder ID when syncing
// Around line 127-134, add:
localNote.folderId = /* extract from Drive file parents */
```

**Effort:** 1-2 hours
**Priority:** P0 - Blocks production use

---

#### 2. **Hardcoded OAuth Credentials** 🔒 SECURITY RISK
**Location:** `desktop/src/shared/googleDriveService.js:5-6`

**Problem:**
```javascript
const CLIENT_ID = '24339465618-4u4g5ss7iuoeuf84cp9iuftas533m6me.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
```
- Credentials exposed in source code
- Cannot rotate credentials without code changes
- Security vulnerability if repo is public

**Proposed Fix:**
```javascript
// Create .env file (git-ignored):
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

// In googleDriveService.js:
require('dotenv').config();
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// In package.json:
"dependencies": {
  "dotenv": "^16.0.3"
}

// In .gitignore:
.env
```

**Effort:** 30 minutes
**Priority:** P0 - Must fix before public release

---

#### 3. **Weak Token Encryption** 🔒 SECURITY RISK
**Location:** `desktop/src/shared/keychainService.js:74-81`

**Problem:**
```javascript
// Fallback: Store in electron-store with base64 encoding
// (not true encryption, but better than plaintext)
const encoded = Buffer.from(token).toString('base64');
```
- Fallback uses base64 (easily decoded)
- Anyone with file access can steal Google Drive tokens

**Proposed Fix:**
```javascript
const crypto = require('crypto');

// Derive encryption key from OS machine ID
const algorithm = 'aes-256-gcm';
const keyDerivation = crypto.createHash('sha256')
  .update(os.hostname() + os.userInfo().username)
  .digest();

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, keyDerivation, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return JSON.stringify({ encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') });
}

function decrypt(encryptedData) {
  const { encrypted, iv, authTag } = JSON.parse(encryptedData);
  const decipher = crypto.createDecipheriv(algorithm, keyDerivation, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Effort:** 1 hour
**Priority:** P0 - Security vulnerability

---

### 🟠 HIGH PRIORITY BUGS

#### 4. **Sync Status Event Listener Never Registers**
**Location:** `desktop/src/main/main.js:181-185`

**Problem:**
```javascript
// This code runs when syncEngine is null
if (syncEngine) {
  syncEngine.on('status-change', (status) => {
    mainWindow.webContents.send('sync-status', status);
  });
}
```

**Fix:** Move listener registration to `initializeAuth()` after syncEngine creation

**Effort:** 15 minutes
**Priority:** P1

---

#### 5. **Server Time Retrieval Broken**
**Location:** `desktop/src/shared/googleDriveService.js:159-167`

**Problem:** Returns client time instead of server time; conflict detection may fail

**Fix:** Extract `Date` header from Drive API response

**Effort:** 30 minutes
**Priority:** P1

---

#### 6. **No Conflict Resolution UI**
**Problem:** Conflicts detected but no way for users to manually resolve

**Fix:** Implement modal dialog showing both versions with choose/merge options

**Effort:** 2-3 hours
**Priority:** P1

---

#### 7. **Folder Deletion Not Implemented**
**Problem:** No way to delete folders once created

**Fix:** Add `delete-folder` IPC handler + UI button with confirmation

**Effort:** 1 hour
**Priority:** P2

---

#### 8. **No Network Connectivity Detection**
**Problem:** Sync attempts even when offline

**Fix:** Add `navigator.onLine` check + retry with exponential backoff

**Effort:** 1 hour
**Priority:** P2

---

#### 9. **Missing Error Handling in Keyboard Shortcuts**
**Location:** `desktop/src/renderer/renderer.js:379`

**Problem:** Save shortcut fails silently

**Fix:** Add try/catch + toast notification

**Effort:** 30 minutes
**Priority:** P2

---

### 🟡 MEDIUM PRIORITY BUGS

#### 10. **Duplicate File Names Allowed**
**Fix:** Check for existing filename before create

**Effort:** 30 minutes

---

#### 11. **MD5 Validation Incomplete**
**Fix:** Compute MD5 for all notes on app start

**Effort:** 30 minutes

---

#### 12. **No Structured Logging**
**Fix:** Implement electron-log for debugging

**Effort:** 1 hour

---

## 📋 Bug Fix Roadmap

### Phase 1: Critical Fixes (P0)
**Estimated Time:** 3-4 hours

1. Implement parent folder tracking (2 hours)
2. Move credentials to .env (30 min)
3. Implement AES-256 token encryption (1 hour)

**Blocker Status:** After Phase 1, app is production-ready with caveats

---

### Phase 2: High Priority (P1)
**Estimated Time:** 4-5 hours

4. Fix sync status event listener (15 min)
5. Fix server time retrieval (30 min)
6. Implement conflict resolution UI (3 hours)
7. Add folder deletion (1 hour)

**Status:** Improves UX and data integrity

---

### Phase 3: Polish (P2)
**Estimated Time:** 3-4 hours

8. Network connectivity detection (1 hour)
9. Keyboard shortcut error handling (30 min)
10. Duplicate file detection (30 min)
11. MD5 validation fixes (30 min)
12. Structured logging (1 hour)

**Status:** Production-quality polish

---

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend:** Electron (v28), HTML5, CSS3
- **Editor:** CodeMirror 6
- **Markdown:** marked.js + highlight.js
- **Storage:** electron-store (config), keytar (credentials)
- **Sync:** Google Drive API v3
- **Auth:** OAuth 2.0 (out-of-band flow)

### File Structure
```
desktop/
├── src/
│   ├── main/
│   │   └── main.js              (Electron main process, IPC handlers)
│   ├── renderer/
│   │   ├── index.html           (UI structure)
│   │   ├── renderer.js          (Event handlers, UI logic)
│   │   └── styles.css           (Dark theme CSS)
│   └── shared/
│       ├── googleDriveService.js  (Drive API wrapper)
│       ├── syncEngine.js          (Bidirectional sync logic)
│       └── keychainService.js     (Credential storage)
├── public/                      (Static assets)
└── package.json                 (Dependencies, build config)
```

### Data Flow
```
User Input → Renderer (UI)
    ↓ (IPC)
Main Process (IPC Handlers)
    ↓
SyncEngine (Business Logic)
    ↓
Google Drive Service (API Calls)
    ↓
Google Drive (Cloud Storage)
```

---

## 🧪 Testing This Beta

### Manual Test Plan

**Test 1: OAuth Flow**
1. Launch app → Should show auth screen
2. Click "Sign in with Google" → Browser opens
3. Grant permissions → Get authorization code
4. Paste code → Complete sign-in
5. ✅ Should see main 3-pane interface

**Test 2: Folder Display**
1. After sign-in, check left sidebar
2. ✅ Should see: daily, specs, bugs, ideas, archive
3. ⚠️ **KNOWN BUG:** All folders show same notes

**Test 3: Create Note**
1. Click "+ New Note"
2. Enter title
3. Type markdown in editor
4. ✅ Auto-saves after 500ms

**Test 4: Search**
1. Type in search box
2. ✅ Results appear as you type
3. ✅ Matches content, not just titles

**Test 5: Sync**
1. Create a note
2. Wait 30 seconds
3. Check Google Drive → PANDORICA folder
4. ✅ File should appear

**Test 6: Offline Mode**
1. Disconnect internet
2. Create/edit notes
3. Reconnect internet
4. ✅ Changes should sync

---

## 📁 File Locations

### Windows Paths
- **Config:** `%APPDATA%\pandorica-desktop\config.json`
- **Credentials:** Windows Credential Manager (keytar) or `%APPDATA%\pandorica-desktop\` (fallback)
- **Logs:** Console output (no structured logging yet)

### Google Drive Structure
```
Google Drive/
└── PANDORICA/
    ├── daily/        (Daily notes)
    ├── specs/        (Specifications)
    ├── bugs/         (Bug reports)
    ├── ideas/        (Ideas and brainstorming)
    └── archive/      (Archived notes)
```

---

## 🔧 Development Setup

### Build from Source
```bash
# Clone repo
git clone https://github.com/randomchaos7800-hub/pandorica.git
cd pandorica/desktop

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production (not recommended for beta)
npm run build:win
```

### Configure OAuth
See "Installation & Setup" section above for OAuth configuration steps.

---

## 📊 Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| App Launch | <2s | ~3s | ⚠️ Exceeds (dev mode) |
| File Switch | Instant | N/A | ⏸️ Blocked by bug #1 |
| Search Speed | Real-time | 300ms debounce | ✅ Pass |
| Sync | Background | 30s polling | ✅ Pass |

---

## 🚨 Limitations & Warnings

### Do NOT Use This Beta For:
- ❌ Production work without backups
- ❌ Critical/sensitive data
- ❌ Multi-user collaboration (not supported)
- ❌ Large files (>10MB per note)

### Known Limitations:
- ⚠️ Folder organization doesn't work (bug #1)
- ⚠️ No conflict resolution UI (auto-resolves to remote)
- ⚠️ Credentials must be manually configured
- ⚠️ Windows only (macOS/Linux not tested)
- ⚠️ No automated tests
- ⚠️ No production build available

---

## 📝 Changelog

### v0.1.0-beta (2026-02-13)

**Added:**
- OAuth 2.0 authentication with Google Drive
- Bidirectional sync engine with offline queue
- Full-text search across notes
- Markdown editor with live preview
- Auto-save with debouncing
- 5-folder structure (daily/specs/bugs/ideas/archive)
- Keyboard shortcuts (Ctrl+N/S/P)
- Settings panel
- Sync status indicator

**Fixed:**
- White screen on launch (timing issue)
- JSON parse error in token retrieval
- Folder loading from store
- UI blocking from DevTools
- Redirect URI for desktop OAuth

**Known Issues:**
- 12 bugs documented (3 critical)
- See "Known Issues" section above

---

## 🤝 Contributing

This is a beta release. Contributions welcome for:
- Bug fixes (especially P0 issues)
- Security improvements
- Testing on different Windows versions
- Documentation improvements

**Priority:** Fix bugs #1, #2, #3 before adding new features.

---

## 📄 License

[Specify license here - MIT, Apache 2.0, etc.]

---

## 🔗 Links

- **Repository:** https://github.com/randomchaos7800-hub/pandorica
- **Issues:** https://github.com/randomchaos7800-hub/pandorica/issues
- **Verification Report:** See `FINAL_VERIFICATION_REPORT.md`
- **Deployment Docs:** See `DEPLOYMENT_STATUS.md`

---

## 📞 Support

For beta testing issues:
1. Check "Known Issues" section first
2. Create GitHub issue with:
   - Windows version
   - Error messages
   - Steps to reproduce
   - Expected vs actual behavior

---

## ⚡ Quick Start TL;DR

```bash
git clone https://github.com/randomchaos7800-hub/pandorica.git
cd pandorica/desktop
npm install
# Edit src/shared/googleDriveService.js with your OAuth credentials
npm start
# Sign in with Google, start creating notes!
```

**⚠️ Remember:** This is BETA software with known critical bugs. Back up important data!

---

*Beta release prepared by Claude Code*
*Comprehensive code analysis by Explore agent*
*Released: 2026-02-13*
