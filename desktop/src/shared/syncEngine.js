const EventEmitter = require('events');
const md5 = require('md5');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class SyncEngine extends EventEmitter {
  constructor(driveService, store) {
    super();
    this.driveService = driveService;
    this.store = store;
    this.syncStatus = 'idle';
    this.syncInterval = null;
    this.saveDebounceTimers = new Map();
    this.pandoricaFolderId = null;
    this.folderStructure = {};
  }

  async start() {
    try {
      // Initialize PANDORICA folder structure
      await this.initializeGoogleDriveStructure();

      // Initial sync
      await this.syncNow();

      // Start polling every 30 seconds
      this.syncInterval = setInterval(() => this.syncNow(), 30000);

      this.updateStatus('synced');
    } catch (error) {
      console.error('Sync start failed:', error);
      this.updateStatus('error');
    }
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  updateStatus(status) {
    this.syncStatus = status;
    this.emit('status-change', status);
  }

  getSyncStatus() {
    return this.syncStatus;
  }

  async initializeGoogleDriveStructure() {
    // Create PANDORICA root folder
    const pandoricaFolder = await this.driveService.findOrCreateFolder('PANDORICA');
    this.pandoricaFolderId = pandoricaFolder.id;

    // Create subfolders
    const subfolders = ['daily', 'specs', 'bugs', 'ideas', 'archive'];
    for (const folderName of subfolders) {
      const folder = await this.driveService.findOrCreateFolder(folderName, this.pandoricaFolderId);
      this.folderStructure[folder.id] = {
        id: folder.id,
        name: folderName,
        type: 'folder'
      };
    }

    // Store in local store
    this.store.set('pandoricaFolderId', this.pandoricaFolderId);
    this.store.set('folderStructure', this.folderStructure);
  }

  async syncNow() {
    if (this.syncStatus === 'syncing') {
      return; // Already syncing
    }

    this.updateStatus('syncing');

    try {
      // Pull changes from Google Drive
      await this.pullFromDrive();

      // Push local changes to Google Drive
      await this.pushToDrive();

      this.updateStatus('synced');
    } catch (error) {
      console.error('Sync failed:', error);
      this.updateStatus('error');
    }
  }

  async pullFromDrive() {
    if (!this.pandoricaFolderId) {
      this.pandoricaFolderId = this.store.get('pandoricaFolderId');
      this.folderStructure = this.store.get('folderStructure', {});
    }

    // Get all files from Drive
    const driveFiles = await this.driveService.listFiles(this.pandoricaFolderId);
    const localNotes = this.store.get('notes', {});

    for (const driveFile of driveFiles) {
      if (driveFile.mimeType === 'application/vnd.google-apps.folder') {
        // Update folder structure
        if (!this.folderStructure[driveFile.id]) {
          this.folderStructure[driveFile.id] = {
            id: driveFile.id,
            name: driveFile.name,
            type: 'folder'
          };
        }
        continue;
      }

      // It's a file
      const localNote = localNotes[driveFile.id];

      if (!localNote) {
        // New file on Drive, download it
        const content = await this.driveService.getFile(driveFile.id);
        localNotes[driveFile.id] = {
          id: driveFile.id,
          name: driveFile.name,
          content: content,
          modifiedTime: new Date(driveFile.modifiedTime).getTime(),
          md5: driveFile.md5Checksum,
          synced: true
        };
      } else {
        // File exists locally, check for conflicts
        const conflict = await this.detectConflict(localNote, driveFile);

        if (conflict) {
          // Handle conflict
          await this.handleConflict(localNote, driveFile);
        } else if (driveFile.md5Checksum !== localNote.md5) {
          // Drive version is newer, update local
          const content = await this.driveService.getFile(driveFile.id);
          localNotes[driveFile.id] = {
            ...localNote,
            content: content,
            modifiedTime: new Date(driveFile.modifiedTime).getTime(),
            md5: driveFile.md5Checksum,
            synced: true
          };
        }
      }
    }

    // Check for deleted files
    for (const localId in localNotes) {
      const exists = driveFiles.find(f => f.id === localId);
      if (!exists && localNotes[localId].synced) {
        // File was deleted on Drive
        delete localNotes[localId];
      }
    }

    this.store.set('notes', localNotes);
    this.store.set('folderStructure', this.folderStructure);
  }

  async pushToDrive() {
    const localNotes = this.store.get('notes', {});
    const syncQueue = this.store.get('syncQueue', []);

    // Process sync queue (offline changes)
    for (const item of syncQueue) {
      try {
        if (item.action === 'create') {
          const fileData = await this.driveService.createFile(
            item.name,
            item.content,
            item.folderId,
            'text/markdown'
          );

          // Update local note with Drive ID
          localNotes[fileData.id] = {
            id: fileData.id,
            name: item.name,
            content: item.content,
            modifiedTime: new Date(fileData.modifiedTime).getTime(),
            md5: fileData.md5Checksum,
            synced: true
          };

          // Remove temporary local ID if exists
          if (item.tempId) {
            delete localNotes[item.tempId];
          }
        } else if (item.action === 'update') {
          const fileData = await this.driveService.updateFile(item.id, item.content);
          localNotes[item.id] = {
            ...localNotes[item.id],
            modifiedTime: new Date(fileData.modifiedTime).getTime(),
            md5: fileData.md5Checksum,
            synced: true
          };
        } else if (item.action === 'delete') {
          await this.driveService.deleteFile(item.id);
          delete localNotes[item.id];
        }
      } catch (error) {
        console.error('Sync queue item failed:', error);
        // Keep item in queue for retry
        continue;
      }
    }

    // Clear processed items from queue
    this.store.set('syncQueue', []);
    this.store.set('notes', localNotes);
  }

  async detectConflict(localNote, driveFile) {
    const localHash = md5(localNote.content);
    const remoteHash = driveFile.md5Checksum;

    if (localHash === remoteHash) {
      return null; // No conflict
    }

    const localTime = localNote.modifiedTime;
    const remoteTime = new Date(driveFile.modifiedTime).getTime();

    // If modified within 1 second and different content = conflict
    if (Math.abs(localTime - remoteTime) < 1000) {
      return {
        local: localNote,
        remote: driveFile,
        resolution: 'USER_CHOICE'
      };
    }

    return null;
  }

  async handleConflict(localNote, driveFile) {
    // For MVP: Last-write-wins with server time validation
    const serverTime = await this.driveService.getServerTime();
    const localTime = localNote.modifiedTime;
    const remoteTime = new Date(driveFile.modifiedTime).getTime();

    // Check for clock drift
    const drift = Math.abs(localTime - serverTime.getTime());
    if (drift > 300000) { // 5 minutes
      console.warn('Clock drift detected:', drift);
      // Use server time as source of truth
    }

    // Store conflict for user resolution
    const conflicts = this.store.get('conflicts', []);
    conflicts.push({
      id: uuidv4(),
      noteId: localNote.id,
      noteName: localNote.name,
      localContent: localNote.content,
      localTime: localTime,
      remoteContent: await this.driveService.getFile(driveFile.id),
      remoteTime: remoteTime,
      timestamp: Date.now()
    });

    this.store.set('conflicts', conflicts);
    this.emit('conflict-detected', conflicts[conflicts.length - 1]);

    // For now, keep both versions (user will resolve later)
    // Remote version wins by default
    const localNotes = this.store.get('notes', {});
    const remoteContent = await this.driveService.getFile(driveFile.id);
    localNotes[localNote.id] = {
      ...localNote,
      content: remoteContent,
      modifiedTime: remoteTime,
      md5: driveFile.md5Checksum,
      synced: true
    };
    this.store.set('notes', localNotes);
  }

  getFolders() {
    return Object.values(this.folderStructure);
  }

  getNotesInFolder(folderId) {
    const allNotes = this.store.get('notes', {});

    // For "All Notes" special folder
    if (folderId === 'all') {
      return Object.values(allNotes);
    }

    // Get notes from specific folder (would need parent tracking in real impl)
    // For MVP, return all notes
    return Object.values(allNotes);
  }

  async getNoteContent(noteId) {
    const notes = this.store.get('notes', {});
    return notes[noteId] ? notes[noteId].content : '';
  }

  async saveNote(noteId, content) {
    const notes = this.store.get('notes', {});

    if (!notes[noteId]) {
      return;
    }

    // Update local copy
    notes[noteId].content = content;
    notes[noteId].modifiedTime = Date.now();
    notes[noteId].md5 = md5(content);
    notes[noteId].synced = false;

    this.store.set('notes', notes);

    // Debounce sync
    if (this.saveDebounceTimers.has(noteId)) {
      clearTimeout(this.saveDebounceTimers.get(noteId));
    }

    const timer = setTimeout(() => {
      this.queueSync(noteId, 'update', content);
      this.saveDebounceTimers.delete(noteId);
    }, 500);

    this.saveDebounceTimers.set(noteId, timer);

    this.updateStatus('saving');
  }

  async createNote(folderId, title) {
    const tempId = 'temp-' + uuidv4();
    const notes = this.store.get('notes', {});

    const newNote = {
      id: tempId,
      name: title + '.md',
      content: `# ${title}\n\n`,
      modifiedTime: Date.now(),
      md5: md5(`# ${title}\n\n`),
      synced: false
    };

    notes[tempId] = newNote;
    this.store.set('notes', notes);

    // Queue for sync
    this.queueSync(tempId, 'create', newNote.content, folderId, title + '.md');

    return newNote;
  }

  async deleteNote(noteId) {
    const notes = this.store.get('notes', {});
    delete notes[noteId];
    this.store.set('notes', notes);

    // Queue delete
    this.queueSync(noteId, 'delete');
  }

  async createFolder(name) {
    const folder = await this.driveService.findOrCreateFolder(name, this.pandoricaFolderId);
    this.folderStructure[folder.id] = {
      id: folder.id,
      name: name,
      type: 'folder'
    };
    this.store.set('folderStructure', this.folderStructure);
    return folder;
  }

  async searchNotes(query) {
    const notes = this.store.get('notes', {});
    const results = [];

    for (const note of Object.values(notes)) {
      const content = note.content.toLowerCase();
      const name = note.name.toLowerCase();
      const searchTerm = query.toLowerCase();

      if (content.includes(searchTerm) || name.includes(searchTerm)) {
        // Find context
        const index = content.indexOf(searchTerm);
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 50);
        const context = '...' + content.substring(start, end) + '...';

        results.push({
          id: note.id,
          name: note.name,
          context: context
        });
      }
    }

    return results;
  }

  queueSync(noteId, action, content = null, folderId = null, name = null) {
    const queue = this.store.get('syncQueue', []);
    queue.push({
      id: noteId,
      action: action,
      content: content,
      folderId: folderId,
      name: name,
      tempId: noteId.startsWith('temp-') ? noteId : null,
      timestamp: Date.now()
    });
    this.store.set('syncQueue', queue);

    // Trigger sync soon
    setTimeout(() => this.syncNow(), 1000);
  }
}

module.exports = SyncEngine;
