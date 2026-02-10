# Task: Build PANDORICA MVP - Cross-Platform Markdown Notes System

## Executive Summary

Build PANDORICA, a cross-platform markdown notes application that replaces Obsidian with self-hosted Google Drive sync. The system must provide consistent UI/UX across Mac, Windows, iOS, and iPad while maintaining Claude Code integration on desktop platforms for programmatic note management.

This is infrastructure investment: redirect $10/month Obsidian subscription (~$120/year) to Mike's API budget (~40M Haiku input tokens annually). The goal is gold medal quality - this will be used daily across four devices with zero tolerance for data loss or sync failures.

Critical architectural decision delegated to swarm: Choose between (a) native Swift for Mac + Electron for Windows, or (b) Electron for both Mac and Windows. Decision criteria: code reuse vs native feel, with visual consistency prioritized over technical purity.

## Current State

Empty project. PANDORICA-spec.pdf contains complete specification. No existing codebase. No prior Obsidian replacement attempts. User currently relies on Obsidian with paid sync subscription.

## Desired State

Four production-ready applications:
1. **Mac Desktop App** - Installable .app bundle with full markdown editing, sync, and Claude Code integration
2. **Windows Desktop App** - Installable .exe with identical UX to Mac version
3. **iOS App** - Native Swift app installable via Apple Developer account
4. **iPad App** - Native Swift app (can share iOS codebase) with keyboard/multitasking support

All apps sync markdown files via Google Drive API. Files accessible to Claude Code on desktop platforms. OAuth 2.0 authentication flow. Zero vendor lock-in (standard .md files).

## Requirements

### Functional Requirements

**Markdown Editing:**
- Live split-pane preview (editor left, rendered right on desktop; toggle on mobile)
- CommonMark standard compliance
- Syntax highlighting in editor pane
- Support: H1-H6 headers, lists, code blocks, links, images, tables, blockquotes, bold/italic/strikethrough

**File Management:**
- Tree view navigation with collapsible folders
- Create/rename/delete files and folders
- Move files between folders (drag-drop on desktop)
- File search by name
- Quick switcher (CMD/CTRL+P to jump to any file)

**Search:**
- Full-text search across all markdown files
- Live results while typing
- Results show context (surrounding lines)
- Click result to jump to file and location

**Sync:**
- Google Drive API v3 integration
- OAuth 2.0 authentication flow
- Offline mode with change queueing
- Last-write-wins conflict resolution with timestamp
- Sync status indicator (synced/syncing/offline)
- Manual sync trigger button
- Background polling every 30 seconds when active

**Claude Code Integration (Desktop Only):**
- Markdown files accessible via standard filesystem paths
- Clear documentation of file locations (Mac vs Windows)
- Example use cases documented

**First-Run Setup:**
- "Welcome to PANDORICA" screen
- "Sign in with Google" OAuth flow
- Automatic creation of Google Drive/PANDORICA/ folder structure
- Setup complete confirmation

### Non-Functional Requirements

**Performance:**
- App launch: < 2 seconds
- File switching: Instant
- Search: Results appear as user types
- Sync: Background operation, non-blocking UI

**Security:**
- OAuth 2.0 only (no password storage)
- Refresh tokens in system keychain
- All data in user's Google Drive only
- No telemetry, analytics, or tracking
- No data sent anywhere except Google Drive

**Reliability:**
- Zero data loss during normal operation
- Graceful handling of network failures
- Graceful handling of Google Drive quota exceeded
- Offline edits queue and sync when back online
- Simultaneous edit conflicts resolved visibly

**Maintainability:**
- Full source code with comments
- Build scripts included
- README with development setup
- Architecture documentation

### Technical Requirements

**Desktop Stack (SWARM DECIDES):**
- Option A: Native Swift (Mac) + Electron (Windows)
- Option B: Electron for both Mac and Windows
- Decision criteria: Code reuse vs native feel
- Constraint: Visual consistency across platforms required

**Mobile Stack:**
- Native Swift/SwiftUI for iOS and iPad
- Share codebase between iOS/iPad if possible
- Installable via Apple Developer account (no App Store submission)

**Sync Stack:**
- Google Drive API v3
- OAuth scopes: `drive.file` (app-created files), `drive.appdata` (settings)
- Store refresh token securely (system keychain)
- Handle token refresh automatically

**File Format:**
- UTF-8 encoded .md files
- No frontmatter required (optional for metadata)
- Standard markdown readable in any text editor

**Google Drive Structure:**
```
Google Drive/PANDORICA/
├── daily/
├── specs/
├── bugs/
├── ideas/
└── archive/
```

## Acceptance Criteria

### Must Have (Deployment Blockers)
- [ ] Can create, edit, delete markdown files
- [ ] Files sync reliably across Mac, Windows, iOS, iPad
- [ ] UI is consistent and familiar across desktop platforms
- [ ] Full-text search works and is fast
- [ ] Claude Code can access markdown files on desktop (documented paths)
- [ ] OAuth flow works smoothly on all platforms
- [ ] App creates Google Drive folder structure automatically on first launch
- [ ] Offline mode queues changes for sync
- [ ] No data loss during normal operation
- [ ] Installable via Apple Developer account (iOS/iPad)
- [ ] Architecture decision documented (native vs Electron reasoning)

### Should Have (Fix Before 1.0)
- [ ] Keyboard shortcuts documented
- [ ] Conflict resolution UI (if simultaneous edits occur)
- [ ] Manual sync trigger button
- [ ] Settings panel (Google account, folder location)
- [ ] About screen with version number

### Nice to Have (Can Ship Without)
- [ ] Multiple file tabs (desktop)
- [ ] Drag-and-drop file reorganization
- [ ] Image paste from clipboard
- [ ] Recent files list
- [ ] Markdown cheat sheet in app

## Out of Scope

Explicitly NOT included in MVP:
- Tags and tag-based filtering
- Wiki-style links between notes ([[link]])
- Graph view of note connections
- Custom themes / dark mode toggle
- Plugins or extensions
- End-to-end encryption layer
- Alternative sync backends (iCloud, Dropbox, self-hosted)
- Vim keybindings mode
- Export to PDF/HTML
- App Store submission
- Code signing / notarization (unsigned for now)

## Dependencies

**External Services:**
- Google Drive API v3
- OAuth 2.0 authentication (Google)

**Development Requirements:**
- Xcode (for Mac/iOS/iPad builds)
- Apple Developer account (for iOS/iPad installation)
- Windows development environment if building Windows app
- Node.js if using Electron

**User Requirements:**
- Google account with Drive access
- Sufficient Google Drive storage quota

## Risks & Considerations

**Architectural Decision Risk:**
- Native vs Electron choice affects code reuse, maintenance burden, and UX
- Committee must weigh tradeoffs: shared codebase vs platform-native feel
- Recommend documenting decision rationale in build log

**Sync Conflict Risk:**
- Last-write-wins may lose data if user edits same file on two devices simultaneously
- Mitigation: Clear conflict resolution UI, timestamp-based merging
- Test scenario: Edit file on Mac and iPhone offline, bring both online

**Google Drive Quota Risk:**
- Free accounts: 15GB shared across Gmail/Photos/Drive
- Mitigation: App handles quota errors gracefully, shows clear error to user
- Test scenario: Exhaust quota, attempt sync

**OAuth Token Expiration:**
- Refresh tokens can be revoked by user or expire
- Mitigation: Graceful re-auth flow when token invalid
- Test scenario: Revoke token via Google account settings, attempt sync

**Platform Differences:**
- Keychain APIs differ (macOS Keychain vs Windows Credential Manager vs iOS Keychain)
- File paths differ (macOS vs Windows)
- Mitigation: Abstract keychain/storage layer, document platform-specific paths

## Testing Requirements

### Automated Tests
- Unit tests for markdown parser
- Integration tests for Google Drive API calls
- Sync conflict scenarios (simultaneous edits)

### Manual Testing Checklist
- [ ] Create note on Mac → Appears on Windows
- [ ] Create note on iPhone → Appears on Mac
- [ ] Edit note on Windows → Changes appear on iPad
- [ ] Delete note on iPad → Deleted on all devices
- [ ] Offline edit on Mac → Syncs when back online
- [ ] Simultaneous edit on two devices → Conflict resolved
- [ ] Claude Code can read/write notes on Mac
- [ ] Claude Code can read/write notes on Windows
- [ ] App survives Google Drive quota exceeded
- [ ] App handles network failures gracefully
- [ ] OAuth token refresh works
- [ ] Large files (>1MB) sync correctly
- [ ] Search finds content across all notes

## Documentation Requirements

**User Documentation:**
- User guide (how to use PANDORICA)
- Setup guide (Google account, first run)
- Keyboard shortcuts reference

**Developer Documentation:**
- Architecture documentation (decision rationale, component structure)
- Build instructions for each platform
- Claude Code integration guide (file paths, example usage)
- Provisioning profile setup guide (iOS/iPad)

**Code Documentation:**
- Inline comments for non-obvious logic
- README with development setup
- Build scripts with usage instructions

## Success Metrics

1. **Functional:** All "Must Have" acceptance criteria met
2. **Performance:** Sub-2-second app launch, instant file switching
3. **Reliability:** Zero data loss during 30-day testing period
4. **Usability:** Dino can use it without referring to documentation
5. **Integration:** Claude Code can programmatically manage notes on Mac and Windows
6. **Budget:** Obsidian subscription cancelled, $10/month redirected to Mike

## Timeline Expectations

This is a large multi-platform project. Estimate:
- Architecture decision + planning: 1 committee session (3 rounds)
- Desktop implementation: Significant build time
- Mobile implementation: Significant build time
- Integration testing: Thorough multi-device testing required

Priority: Correctness over speed. Gold medal quality required.

## References

- **Master Specification:** `PANDORICA-spec.pdf` (12 pages, complete)
- **Project Context:** `CLAUDE.md` (project overview, constraints, principles)
- **Google Drive API:** https://developers.google.com/drive/api/v3/reference
- **OAuth 2.0:** https://developers.google.com/identity/protocols/oauth2
- **CommonMark Spec:** https://commonmark.org/

---

**Task Type:** Full implementation (greenfield)
**Priority:** High (infrastructure investment)
**Quality Bar:** Gold medal (daily use, zero data loss tolerance)
**Swarm Kit:** v4.0 (molly) with autonomous execution
