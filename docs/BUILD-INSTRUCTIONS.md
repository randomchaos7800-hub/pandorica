# Build Instructions

Complete guide to building PANDORICA from source.

## Prerequisites

### Desktop Build

- Node.js 18+ and npm
- Git
- macOS (for Mac builds) or Windows (for Windows builds)

### Mobile Build

- macOS with Xcode 14+
- Apple Developer account
- CocoaPods (if using dependencies via pods)

## OAuth Setup (Required First)

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "PANDORICA"
3. Note your Project ID

### 2. Enable Google Drive API

1. Navigate to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click "Enable"

### 3. Create OAuth Credentials

**For Desktop (Electron):**
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: "Desktop app"
4. Name: "PANDORICA Desktop"
5. Click "Create"
6. Note your **Client ID** and **Client Secret**

**For Mobile (iOS):**
1. Click "Create Credentials" → "OAuth 2.0 Client ID"
2. Application type: "iOS"
3. Bundle ID: `com.pandorica.app`
4. Click "Create"
5. Note your **Client ID** (no secret for iOS)

### 4. Configure Redirect URIs

**Desktop:**
- Authorized redirect URI: `http://localhost:3000/oauth2callback`

**iOS:**
- URL scheme: `com.googleusercontent.apps.YOUR_CLIENT_ID`

## Desktop Build

### 1. Clone and Install

```bash
git clone [your-repo-url]
cd pandorica/desktop
npm install
```

### 2. Configure OAuth

Edit `src/shared/googleDriveService.js`:

```javascript
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
```

Replace `YOUR_CLIENT_ID` and `YOUR_CLIENT_SECRET` with values from Google Cloud Console.

### 3. Run Development

```bash
npm start
```

App launches in development mode with hot reload.

### 4. Build for Production

**macOS:**
```bash
npm run build:mac
```

Output: `desktop/dist/mac/PANDORICA.app`

**Windows:**
```bash
npm run build:win
```

Output: `desktop/dist/win-unpacked/PANDORICA.exe`

### 5. Test Build

**macOS:**
```bash
open dist/mac/PANDORICA.app
```

**Windows:**
```bash
start dist/win-unpacked/PANDORICA.exe
```

## Mobile Build

### 1. Open in Xcode

```bash
cd pandorica/mobile
open PANDORICA.xcodeproj
```

If using Swift Package Manager, dependencies auto-resolve on first build.

### 2. Configure OAuth

Edit `PANDORICA/Services/GoogleDriveService.swift`:

```swift
private let clientId = "YOUR_CLIENT_ID.apps.googleusercontent.com"
private let clientSecret = ""  // Not needed for iOS
private let redirectUri = "com.googleusercontent.apps.YOUR_CLIENT_ID:/oauthredirect"
```

### 3. Configure URL Scheme

1. Select PANDORICA target
2. Go to "Info" tab
3. Expand "URL Types"
4. Add URL scheme: `com.googleusercontent.apps.YOUR_CLIENT_ID`

### 4. Configure Signing

1. Select PANDORICA target
2. Go to "Signing & Capabilities"
3. Select your Team (Apple Developer account)
4. Xcode auto-generates provisioning profile

### 5. Build & Run

**For iPhone:**
1. Connect iPhone via USB
2. Select iPhone as build target
3. Press Cmd+R to build and run
4. App installs on device

**For iPad:**
1. Connect iPad via USB
2. Select iPad as build target
3. Press Cmd+R to build and run

### 6. Provisioning for Distribution

**Ad-hoc Distribution (no App Store):**

1. Go to [Apple Developer](https://developer.apple.com/)
2. Certificates, Identifiers & Profiles
3. Register your device UDID
4. Create provisioning profile with device
5. Download and install profile
6. Build with profile in Xcode

## Dependencies

### Desktop (package.json)

```json
{
  "electron": "^28.0.0",
  "electron-store": "^8.1.0",
  "codemirror": "^6.0.1",
  "marked": "^11.1.1",
  "highlight.js": "^11.9.0",
  "googleapis": "^128.0.0",
  "keytar": "^7.9.0",
  "uuid": "^9.0.1",
  "md5": "^2.3.0"
}
```

### Mobile (Swift Package Manager)

Dependencies in Xcode:
- None (uses system frameworks: SwiftUI, Foundation, Security)

External libraries (manual integration if needed):
- GoogleSignIn (for OAuth flow)
- Markdown rendering library (optional, basic parser included)

## Platform-Specific Notes

### macOS

**Keychain Access:**
- First run will request keychain permission
- Grant in System Preferences → Security & Privacy

**Notarization:**
- Not implemented in MVP
- For distribution, see [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

### Windows

**Windows Defender:**
- May flag unsigned .exe
- Add exception or use code signing certificate

**Credential Manager:**
- Automatically used for token storage
- No user action required

### iOS/iPad

**Device Trust:**
- First run: Settings → General → VPN & Device Management
- Trust developer certificate

**OAuth Redirect:**
- Must configure URL scheme exactly as shown
- Test OAuth flow on device, not simulator

## Testing

### Desktop

```bash
cd desktop

# Start app
npm start

# Create note
# Edit note
# Check sync to Google Drive
# Go offline, edit, go online, verify sync
# Verify Claude Code can read/write files
```

### Mobile

```bash
# Build and run on device
# Sign in with Google
# Create note
# Verify sync to Google Drive
# Check sync to desktop
# Test offline mode
```

## Troubleshooting

### "OAuth Error: redirect_uri_mismatch"

- Check redirect URI in Google Cloud Console matches code exactly
- Desktop: Must be `http://localhost:3000/oauth2callback`
- iOS: Must be `com.googleusercontent.apps.YOUR_CLIENT_ID:/oauthredirect`

### "Keychain permission denied"

- macOS: Grant permission in System Preferences
- Windows: Run as Administrator once
- iOS: Reinstall app

### "Build failed: Module not found"

```bash
# Desktop
cd desktop
rm -rf node_modules package-lock.json
npm install

# Mobile
# In Xcode: File → Packages → Reset Package Caches
```

### "Code signing failed"

- Ensure Apple Developer account is active
- Verify team selected in Xcode
- Check provisioning profile includes device

## Deployment

### Desktop

**macOS (.app):**
- Located in `dist/mac/PANDORICA.app`
- Copy to Applications folder
- Double-click to run

**Windows (.exe):**
- Located in `dist/win-unpacked/PANDORICA.exe`
- Create desktop shortcut
- Double-click to run

### Mobile

**Installation via Xcode:**
1. Connect device
2. Build and run from Xcode
3. App remains on device

**Ad-hoc Distribution:**
1. Archive build in Xcode
2. Export with ad-hoc profile
3. Send .ipa to users
4. Install via iTunes or Xcode Devices

## Update Process

### Desktop

1. Pull latest code
2. `npm install`
3. Rebuild: `npm run build:mac` or `npm run build:win`
4. Replace old app with new build

### Mobile

1. Pull latest code
2. Rebuild in Xcode
3. Install on device (overwrites previous version)

---

**Build once, run forever.** No subscription, no cloud dependency (except your own Google Drive), full control.
