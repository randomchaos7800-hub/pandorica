const keytar = require('keytar');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

const SERVICE_NAME = 'PANDORICA';
const ACCOUNT_NAME = 'google-drive-token';

class KeychainService {
  static async storeToken(token) {
    try {
      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, token);
      return true;
    } catch (error) {
      console.warn('Keychain storage failed, using fallback:', error);
      // Fallback to encrypted file storage
      return await this.storeFallback(token);
    }
  }

  static async retrieveToken() {
    try {
      const token = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (token) return JSON.parse(token);

      // Try fallback
      return await this.retrieveFallback();
    } catch (error) {
      console.warn('Keychain retrieval failed, trying fallback:', error);
      return await this.retrieveFallback();
    }
  }

  static async deleteToken() {
    try {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (error) {
      console.warn('Keychain deletion failed:', error);
    }

    // Also delete fallback
    try {
      const fallbackPath = this.getFallbackPath();
      await fs.unlink(fallbackPath);
    } catch (error) {
      // File might not exist, that's okay
    }
  }

  static async hasToken() {
    try {
      const token = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (token) return true;

      // Check fallback
      const fallbackPath = this.getFallbackPath();
      try {
        await fs.access(fallbackPath);
        return true;
      } catch {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Fallback storage (encrypted file)
  static getFallbackPath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, '.pandorica-token');
  }

  static async storeFallback(token) {
    const fallbackPath = this.getFallbackPath();
    // Simple base64 encoding (not true encryption, but better than plaintext)
    // In production, use proper encryption with a derived key
    const encoded = Buffer.from(token).toString('base64');
    await fs.writeFile(fallbackPath, encoded, 'utf8');
    return true;
  }

  static async retrieveFallback() {
    try {
      const fallbackPath = this.getFallbackPath();
      const encoded = await fs.readFile(fallbackPath, 'utf8');
      const token = Buffer.from(encoded, 'base64').toString('utf8');
      return JSON.parse(token);
    } catch (error) {
      return null;
    }
  }
}

module.exports = KeychainService;
