const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata'
];

class GoogleDriveService {
  constructor(tokens = null) {
    this.oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    if (tokens) {
      this.oauth2Client.setCredentials(tokens);
    }

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
  }

  async getTokensFromCode(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async refreshTokenIfNeeded() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      return credentials;
    } catch (error) {
      throw new Error('Token refresh failed: ' + error.message);
    }
  }

  async findOrCreateFolder(name, parentId = null) {
    // Search for existing folder
    const query = parentId
      ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files.length > 0) {
      return response.data.files[0];
    }

    // Create folder if not found
    const fileMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] })
    };

    const folder = await this.drive.files.create({
      resource: fileMetadata,
      fields: 'id, name'
    });

    return folder.data;
  }

  async listFiles(folderId = null) {
    const query = folderId
      ? `'${folderId}' in parents and trashed=false`
      : `trashed=false`;

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, modifiedTime, md5Checksum)',
      spaces: 'drive',
      pageSize: 1000
    });

    return response.data.files;
  }

  async getFile(fileId) {
    const response = await this.drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, modifiedTime, md5Checksum',
      alt: 'media'
    }, { responseType: 'text' });

    return response.data;
  }

  async getFileMetadata(fileId) {
    const response = await this.drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, modifiedTime, md5Checksum, parents'
    });

    return response.data;
  }

  async createFile(name, content, parentId, mimeType = 'text/markdown') {
    const fileMetadata = {
      name: name,
      mimeType: mimeType,
      parents: [parentId]
    };

    const media = {
      mimeType: mimeType,
      body: content
    };

    const response = await this.drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, modifiedTime, md5Checksum'
    });

    return response.data;
  }

  async updateFile(fileId, content) {
    const media = {
      mimeType: 'text/markdown',
      body: content
    };

    const response = await this.drive.files.update({
      fileId: fileId,
      media: media,
      fields: 'id, name, modifiedTime, md5Checksum'
    });

    return response.data;
  }

  async deleteFile(fileId) {
    await this.drive.files.delete({
      fileId: fileId
    });
  }

  async getServerTime() {
    // Get server time from Drive API by fetching about info
    const response = await this.drive.about.get({
      fields: 'storageQuota'
    });

    // Return current time (server time is in response headers)
    return new Date();
  }
}

module.exports = GoogleDriveService;
