// Options page script for Obsidian Web Page Notes

class OptionsPage {
  constructor() {
    this.elements = {
      form: document.getElementById('settings-form'),
      apiUrl: document.getElementById('api-url'),
      apiKey: document.getElementById('api-key'),
      notesPath: document.getElementById('notes-path'),
      autoSaveEnabled: document.getElementById('auto-save-enabled'),
      autoSaveDelay: document.getElementById('auto-save-delay'),
      testBtn: document.getElementById('test-connection'),
      statusMessage: document.getElementById('status-message')
    };

    this.init();
  }

  async init() {
    await this.loadSettings();
    this.attachEventListeners();
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'notesPath', 'autoSaveEnabled', 'autoSaveDelay']);
      
      if (settings.apiUrl) {
        this.elements.apiUrl.value = settings.apiUrl;
      }
      
      if (settings.apiKey) {
        this.elements.apiKey.value = settings.apiKey;
      }
      
      if (settings.notesPath) {
        this.elements.notesPath.value = settings.notesPath;
      }

      // Load auto-save settings with defaults
      this.elements.autoSaveEnabled.checked = settings.autoSaveEnabled !== undefined ? settings.autoSaveEnabled : true;
      this.elements.autoSaveDelay.value = settings.autoSaveDelay || 2;
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Failed to load settings');
    }
  }

  attachEventListeners() {
    this.elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    this.elements.testBtn.addEventListener('click', () => {
      this.testConnection();
    });
  }

  async saveSettings() {
    const settings = {
      apiUrl: this.elements.apiUrl.value.trim(),
      apiKey: this.elements.apiKey.value.trim(),
      notesPath: this.elements.notesPath.value.trim() || 'WebPageNotes',
      autoSaveEnabled: this.elements.autoSaveEnabled.checked,
      autoSaveDelay: parseInt(this.elements.autoSaveDelay.value, 10) || 2
    };

    // Validate settings
    if (!settings.apiUrl) {
      this.showError('API URL is required');
      return;
    }

    if (!settings.apiKey) {
      this.showError('API Key is required');
      return;
    }

    // Validate auto-save delay
    if (settings.autoSaveDelay < 1 || settings.autoSaveDelay > 30) {
      this.showError('Auto-save delay must be between 1 and 30 seconds');
      return;
    }

    try {
      await chrome.storage.sync.set(settings);
      this.showSuccess('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Failed to save settings');
    }
  }

  async testConnection() {
    const apiUrl = this.elements.apiUrl.value.trim();
    const apiKey = this.elements.apiKey.value.trim();

    if (!apiUrl) {
      this.showError('API URL is required');
      return;
    }

    if (!apiKey) {
      this.showError('API Key is required');
      return;
    }

    // Validate URL format
    try {
      new URL(apiUrl);
    } catch (error) {
      this.showError('Invalid API URL format. Please enter a valid URL (e.g., http://localhost:27123)');
      return;
    }

    this.elements.testBtn.disabled = true;
    this.elements.testBtn.textContent = 'Testing...';

    try {
      const response = await fetch(`${apiUrl}/`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        this.showSuccess('✓ Connection successful! Obsidian API is reachable.');
      } else if (response.status === 401 || response.status === 403) {
        this.showError('✗ Authentication failed. Check your API key.');
      } else {
        this.showError(`✗ Connection failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        this.showError('✗ Network error. Make sure Obsidian is running and the Local REST API plugin is enabled.');
      } else if (error.name === 'AbortError') {
        this.showError('✗ Connection timeout. Check if Obsidian is running.');
      } else {
        this.showError(`✗ Connection failed: ${error.message}`);
      }
    } finally {
      this.elements.testBtn.disabled = false;
      this.elements.testBtn.textContent = 'Test Connection';
    }
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    this.elements.statusMessage.textContent = message;
    this.elements.statusMessage.className = `status-message ${type}`;
    
    setTimeout(() => {
      this.elements.statusMessage.className = 'status-message hidden';
    }, 5000);
  }
}

// Initialize the options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});
