const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const GoogleDriveService = require('../shared/googleDriveService');
const SyncEngine = require('../shared/syncEngine');
const KeychainService = require('../shared/keychainService');

const store = new Store();
let mainWindow;
let syncEngine;

async function initializeAuth() {
  // Check if user is authenticated
  const hasToken = await KeychainService.hasToken();
  if (hasToken) {
    try {
      const tokenString = await KeychainService.retrieveToken();
      const tokens = typeof tokenString === 'string' ? JSON.parse(tokenString) : tokenString;
      const driveService = new GoogleDriveService(tokens);
      syncEngine = new SyncEngine(driveService, store);

      // Start sync
      syncEngine.start();
      mainWindow.webContents.send('auth-status', { authenticated: true });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      // Clear invalid token
      await KeychainService.deleteToken();
      mainWindow.webContents.send('auth-status', { authenticated: false });
    }
  } else {
    mainWindow.webContents.send('auth-status', { authenticated: false });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff'
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Wait for page to load before sending auth status
  mainWindow.webContents.on('did-finish-load', async () => {
    await initializeAuth();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

ipcMain.handle('start-oauth', async () => {
  const driveService = new GoogleDriveService();
  const authUrl = await driveService.getAuthUrl();

  // Open in system browser
  shell.openExternal(authUrl);

  return { authUrl };
});

ipcMain.handle('complete-oauth', async (event, code) => {
  try {
    const driveService = new GoogleDriveService();
    const tokens = await driveService.getTokensFromCode(code);

    await KeychainService.storeToken(JSON.stringify(tokens));

    // Initialize sync
    const newDriveService = new GoogleDriveService(tokens);
    syncEngine = new SyncEngine(newDriveService, store);

    // Create PANDORICA folder structure
    await syncEngine.initializeGoogleDriveStructure();

    // Start sync
    syncEngine.start();

    return { success: true };
  } catch (error) {
    console.error('OAuth completion failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sign-out', async () => {
  await KeychainService.deleteToken();
  if (syncEngine) {
    syncEngine.stop();
    syncEngine = null;
  }
  store.clear();
  mainWindow.webContents.send('auth-status', { authenticated: false });
  return { success: true };
});

ipcMain.handle('get-folders', async () => {
  if (!syncEngine) return { folders: [] };
  return { folders: syncEngine.getFolders() };
});

ipcMain.handle('get-notes', async (event, folderId) => {
  if (!syncEngine) return { notes: [] };
  return { notes: syncEngine.getNotesInFolder(folderId) };
});

ipcMain.handle('get-note-content', async (event, noteId) => {
  if (!syncEngine) return { content: '' };
  return { content: await syncEngine.getNoteContent(noteId) };
});

ipcMain.handle('save-note', async (event, noteId, content) => {
  if (!syncEngine) return { success: false };
  await syncEngine.saveNote(noteId, content);
  return { success: true };
});

ipcMain.handle('create-note', async (event, folderId, title) => {
  if (!syncEngine) return { success: false };
  const note = await syncEngine.createNote(folderId, title);
  return { success: true, note };
});

ipcMain.handle('delete-note', async (event, noteId) => {
  if (!syncEngine) return { success: false };
  await syncEngine.deleteNote(noteId);
  return { success: true };
});

ipcMain.handle('create-folder', async (event, name) => {
  if (!syncEngine) return { success: false };
  const folder = await syncEngine.createFolder(name);
  return { success: true, folder };
});

ipcMain.handle('search-notes', async (event, query) => {
  if (!syncEngine) return { results: [] };
  return { results: await syncEngine.searchNotes(query) };
});

ipcMain.handle('trigger-sync', async () => {
  if (!syncEngine) return { success: false };
  await syncEngine.syncNow();
  return { success: true };
});

ipcMain.handle('get-sync-status', async () => {
  if (!syncEngine) return { status: 'offline' };
  return { status: syncEngine.getSyncStatus() };
});

// Listen for sync status changes
if (syncEngine) {
  syncEngine.on('status-change', (status) => {
    mainWindow.webContents.send('sync-status', status);
  });
}
