# PANDORICA - Cross-Platform Markdown Notes System

**Project Type:** Desktop + Mobile Application
**Purpose:** Replace Obsidian with self-hosted Google Drive sync
**Platforms:** Mac, Windows, iOS, iPad
**Swarm Kit Version:** 4.0 (molly)

---

## Project Overview

PANDORICA is a cross-platform markdown notes application that provides:
- Consistent UI across Mac, Windows, iOS, and iPad
- Google Drive API sync (no subscription costs)
- Claude Code integration for programmatic note management
- Standard markdown files (no vendor lock-in)

**Value Proposition:** Redirect $10/month Obsidian subscription to Mike's API budget (~3.3M Haiku tokens/month).

---

## Architecture Decisions

### Desktop
**SWARM TO DECIDE:** Native Swift (Mac) + Electron (Windows) OR Electron for both
**Decision Criteria:** Code reuse vs native feel
**Priority:** Visual consistency across platforms matters more than technical purity

### Mobile
- Native Swift/SwiftUI for iOS and iPad
- Can share codebase with Mac if Mac goes native
- Installable via Apple Developer account (no App Store required)

### Sync Layer
- Google Drive API v3 for file storage
- OAuth 2.0 authentication
- All devices authenticate against same Google account
- No custom server infrastructure

---

## File Structure

```
Google Drive/PANDORICA/
├── daily/
│   └── YYYY-MM-DD.md
├── specs/
├── bugs/
├── ideas/
└── archive/
```

**Notes:**
- Application creates structure on first launch
- All files are standard `.md` format
- No proprietary formats or metadata

---

## Core Features (MVP)

### 1. Markdown Editing
- Live preview (split pane: editor | preview)
- CommonMark compliance
- Syntax highlighting

### 2. File Management
- Tree view navigation (collapsible folders)
- Create/rename/delete files and folders
- Quick switcher (CMD/CTRL+P)

### 3. Search
- Full-text search across all markdown files
- Live results as you type
- Click result to jump to location

### 4. Sync
- Google Drive API integration
- Offline mode with change queueing
- Last-write-wins conflict resolution
- Manual sync trigger

### 5. Claude Code Integration (Desktop Only)
- Markdown files accessible via standard filesystem paths
- Clear documentation of file locations for each platform
- Example: "Read my notes on Mike's architecture"

---

## Technology Stack

**Desktop (Mac & Windows):** TBD by Swarm (Native vs Electron)
**Mobile (iOS & iPad):** Native Swift/SwiftUI
**Sync:** Google Drive API v3
**Auth:** OAuth 2.0
**File Format:** UTF-8 `.md` files (CommonMark)

---

## Design Principles

- **Familiar:** Borrow from Apple Notes and Obsidian UI patterns
- **Clean:** Minimal chrome, focus on content
- **Consistent:** Same layout/behavior across Mac and Windows
- **Fast:** Instant search, quick file switching, responsive editing

---

## Acceptance Criteria

### Must Have (Deployment Blockers)
1. ✓ Can create, edit, delete markdown files
2. ✓ Files sync reliably across Mac, Windows, iOS, iPad
3. ✓ UI is consistent across desktop platforms
4. ✓ Full-text search works and is fast
5. ✓ Claude Code can access markdown files on desktop
6. ✓ OAuth flow works smoothly
7. ✓ App creates Google Drive folder structure automatically
8. ✓ Offline mode queues changes for sync
9. ✓ No data loss during normal operation
10. ✓ Installable via Apple Developer account (iOS/iPad)

### Should Have (Fix Before 1.0)
- Keyboard shortcuts documented
- Conflict resolution UI
- Manual sync trigger
- Settings panel
- About screen with version

---

## Project Constraints

- **No feature creep:** MVP only, gold medal execution
- **KISS principle:** Simple and boring beats clever and fragile
- **Fail loudly:** Problems surface visibly, no silent failures
- **Your files:** Standard markdown, no lock-in
- **No subscription:** One-time build, perpetual use

---

## L0 Constraints

- **Honor** — Claims must be verified, not assumed
- **Loyalty** — Project owner's intent comes first
- **Promises** — The approved plan is a commitment
- **Autonomy** — Each agent stays in their lane
- **Systems Over Willpower** — Process enforces correctness
- **Truth Over Shame** — Failures are documented honestly

---

## Swarm Kit v4.0

This project uses Swarm Kit for structured multi-agent development.

- Run tasks: `/execute-task path/to/task-spec.md`
- Task templates: `templates/task-lightweight.md` and `templates/task-full.md`
- Build logs: `build-logs/`
- Case law: `case-law/`
- Agent definitions: `.claude/agents/`

---

## Master Specification

Full specification: `PANDORICA-spec.pdf` (12 pages)

---

**Last Updated:** 2026-02-09
**Swarm Kit:** molly (v4.0)
**Status:** Ready for implementation
