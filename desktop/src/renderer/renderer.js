const { ipcRenderer } = require('electron');
const marked = require('marked');
const hljs = require('highlight.js');

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

// State
let currentFolderId = 'all';
let currentNoteId = null;
let currentMode = 'edit';
let saveTimeout = null;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const signInBtn = document.getElementById('sign-in-btn');
const oauthInstructions = document.getElementById('oauth-instructions');
const oauthCodeInput = document.getElementById('oauth-code');
const completeOauthBtn = document.getElementById('complete-oauth-btn');
const folderList = document.getElementById('folder-list');
const notesList = document.getElementById('notes-list');
const newFolderBtn = document.getElementById('new-folder-btn');
const newNoteBtn = document.getElementById('new-note-btn');
const searchInput = document.getElementById('search-input');
const markdownEditor = document.getElementById('markdown-editor');
const markdownPreview = document.getElementById('markdown-preview');
const editorPane = document.getElementById('editor-pane');
const previewPane = document.getElementById('preview-pane');
const editModeBtn = document.getElementById('edit-mode-btn');
const previewModeBtn = document.getElementById('preview-mode-btn');
const splitModeBtn = document.getElementById('split-mode-btn');
const syncIndicator = document.getElementById('sync-indicator');
const saveIndicator = document.getElementById('save-indicator');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const manualSyncBtn = document.getElementById('manual-sync-btn');

// Initialize
ipcRenderer.on('auth-status', (event, { authenticated }) => {
  if (authenticated) {
    showMainApp();
    loadFolders();
    loadNotes(currentFolderId);
  } else {
    showAuthScreen();
  }
});

ipcRenderer.on('sync-status', (event, status) => {
  updateSyncStatus(status);
});

// Auth Flow
signInBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('start-oauth');
  oauthInstructions.classList.remove('hidden');
});

completeOauthBtn.addEventListener('click', async () => {
  const code = oauthCodeInput.value.trim();
  if (!code) {
    alert('Please paste the authorization code');
    return;
  }

  const result = await ipcRenderer.invoke('complete-oauth', code);
  if (result.success) {
    showMainApp();
    loadFolders();
    loadNotes(currentFolderId);
  } else {
    alert('Sign-in failed: ' + result.error);
  }
});

signOutBtn.addEventListener('click', async () => {
  await ipcRenderer.invoke('sign-out');
  showAuthScreen();
});

function showAuthScreen() {
  authScreen.classList.remove('hidden');
  mainApp.classList.add('hidden');
}

function showMainApp() {
  authScreen.classList.add('hidden');
  mainApp.classList.remove('hidden');
}

// Folders
async function loadFolders() {
  const result = await ipcRenderer.invoke('get-folders');
  renderFolders(result.folders);
}

function renderFolders(folders) {
  // Clear existing folders (except All Notes)
  const existingFolders = folderList.querySelectorAll('.folder-item:not([data-folder-id="all"])');
  existingFolders.forEach(f => f.remove());

  // Add folders
  folders.forEach(folder => {
    const folderEl = document.createElement('div');
    folderEl.className = 'folder-item';
    folderEl.dataset.folderId = folder.id;
    folderEl.textContent = `📂 ${folder.name}`;
    folderEl.addEventListener('click', () => selectFolder(folder.id));
    folderList.appendChild(folderEl);
  });
}

function selectFolder(folderId) {
  currentFolderId = folderId;
  document.querySelectorAll('.folder-item').forEach(el => {
    el.classList.remove('active');
  });
  document.querySelector(`[data-folder-id="${folderId}"]`).classList.add('active');
  loadNotes(folderId);
}

// Notes
async function loadNotes(folderId) {
  const result = await ipcRenderer.invoke('get-notes', folderId);
  renderNotes(result.notes);
}

function renderNotes(notes) {
  notesList.innerHTML = '';

  if (notes.length === 0) {
    notesList.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No notes yet</p>';
    return;
  }

  notes.forEach(note => {
    const noteEl = document.createElement('div');
    noteEl.className = 'note-card';
    noteEl.dataset.noteId = note.id;

    const titleEl = document.createElement('div');
    titleEl.className = 'note-title';
    titleEl.textContent = note.name.replace('.md', '');

    const previewEl = document.createElement('div');
    previewEl.className = 'note-preview';
    previewEl.textContent = note.content.substring(0, 100);

    const timeEl = document.createElement('div');
    timeEl.className = 'note-time';
    timeEl.textContent = formatTime(note.modifiedTime);

    noteEl.appendChild(titleEl);
    noteEl.appendChild(previewEl);
    noteEl.appendChild(timeEl);

    noteEl.addEventListener('click', () => selectNote(note.id));

    notesList.appendChild(noteEl);
  });
}

async function selectNote(noteId) {
  currentNoteId = noteId;
  document.querySelectorAll('.note-card').forEach(el => {
    el.classList.remove('active');
  });
  document.querySelector(`[data-note-id="${noteId}"]`)?.classList.add('active');

  const result = await ipcRenderer.invoke('get-note-content', noteId);
  markdownEditor.value = result.content;
  updatePreview();
}

newNoteBtn.addEventListener('click', async () => {
  const title = prompt('Note title:');
  if (!title) return;

  const result = await ipcRenderer.invoke('create-note', currentFolderId, title);
  if (result.success) {
    await loadNotes(currentFolderId);
    selectNote(result.note.id);
  }
});

newFolderBtn.addEventListener('click', async () => {
  const name = prompt('Folder name:');
  if (!name) return;

  await ipcRenderer.invoke('create-folder', name);
  await loadFolders();
});

// Editor
markdownEditor.addEventListener('input', () => {
  if (currentNoteId) {
    saveIndicator.textContent = '💾 Saving...';

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      await ipcRenderer.invoke('save-note', currentNoteId, markdownEditor.value);
      saveIndicator.textContent = '✓ Saved';
      setTimeout(() => {
        saveIndicator.textContent = '';
      }, 2000);
    }, 500);

    if (currentMode === 'split' || currentMode === 'preview') {
      updatePreview();
    }
  }
});

function updatePreview() {
  const content = markdownEditor.value;
  markdownPreview.innerHTML = marked.parse(content);
}

// Editor Modes
editModeBtn.addEventListener('click', () => setEditorMode('edit'));
previewModeBtn.addEventListener('click', () => setEditorMode('preview'));
splitModeBtn.addEventListener('click', () => setEditorMode('split'));

function setEditorMode(mode) {
  currentMode = mode;

  // Update button states
  editModeBtn.classList.remove('active');
  previewModeBtn.classList.remove('active');
  splitModeBtn.classList.remove('active');

  if (mode === 'edit') {
    editModeBtn.classList.add('active');
    editorPane.classList.remove('hidden');
    editorPane.classList.add('full');
    previewPane.classList.add('hidden');
  } else if (mode === 'preview') {
    previewModeBtn.classList.add('active');
    editorPane.classList.add('hidden');
    previewPane.classList.remove('hidden');
    previewPane.classList.add('full');
    updatePreview();
  } else if (mode === 'split') {
    splitModeBtn.classList.add('active');
    editorPane.classList.remove('hidden');
    editorPane.classList.remove('full');
    previewPane.classList.remove('hidden');
    previewPane.classList.remove('full');
    updatePreview();
  }
}

// Search
let searchTimeout = null;
searchInput.addEventListener('input', () => {
  if (searchTimeout) clearTimeout(searchTimeout);

  const query = searchInput.value.trim();
  if (!query) {
    loadNotes(currentFolderId);
    return;
  }

  searchTimeout = setTimeout(async () => {
    const result = await ipcRenderer.invoke('search-notes', query);
    renderSearchResults(result.results);
  }, 300);
});

function renderSearchResults(results) {
  notesList.innerHTML = '';

  if (results.length === 0) {
    notesList.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No results found</p>';
    return;
  }

  results.forEach(result => {
    const noteEl = document.createElement('div');
    noteEl.className = 'note-card';
    noteEl.dataset.noteId = result.id;

    const titleEl = document.createElement('div');
    titleEl.className = 'note-title';
    titleEl.textContent = result.name.replace('.md', '');

    const contextEl = document.createElement('div');
    contextEl.className = 'note-preview';
    contextEl.textContent = result.context;

    noteEl.appendChild(titleEl);
    noteEl.appendChild(contextEl);

    noteEl.addEventListener('click', () => selectNote(result.id));

    notesList.appendChild(noteEl);
  });
}

// Settings
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.add('visible');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.classList.remove('visible');
});

manualSyncBtn.addEventListener('click', async () => {
  await ipcRenderer.invoke('trigger-sync');
});

// Sync Status
function updateSyncStatus(status) {
  syncIndicator.className = 'sync-status ' + status;

  switch (status) {
    case 'synced':
      syncIndicator.textContent = '✓ Synced';
      break;
    case 'syncing':
      syncIndicator.textContent = '🔄 Syncing...';
      break;
    case 'saving':
      syncIndicator.textContent = '💾 Saving...';
      break;
    case 'error':
      syncIndicator.textContent = '❌ Error';
      break;
    case 'offline':
      syncIndicator.textContent = '⚠️ Offline';
      break;
  }
}

// Utilities
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' days ago';

  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  // CMD/CTRL + P: Quick switcher
  if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
    e.preventDefault();
    searchInput.focus();
  }

  // CMD/CTRL + N: New note
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    newNoteBtn.click();
  }

  // CMD/CTRL + S: Manual save (already auto-saves)
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    if (currentNoteId) {
      ipcRenderer.invoke('save-note', currentNoteId, markdownEditor.value);
    }
  }
});
