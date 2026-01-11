// Side panel script for Obsidian Web Page Notes

// Constants
const NOTE_HEADER_REGEX = /^(# .*?\n\n\*\*URL:\*\*.*?\n\*\*Date:\*\*.*?\n\n---\n\n)/s;

class ObsidianAPI {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.notesPath = '';
  }

  async loadSettings() {
    const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'notesPath']);
    this.baseUrl = settings.apiUrl || 'http://localhost:27123';
    this.apiKey = settings.apiKey || '';
    this.notesPath = settings.notesPath || 'WebPageNotes';
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  getFilePath(url) {
    // Create a safe filename from URL
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      const path = urlObj.pathname.replace(/\//g, '-').replace(/^-/, '').replace(/-$/, '') || 'index';
      const safeName = `${domain}${path}`.replace(/[^a-zA-Z0-9-_]/g, '_');
      return `${this.notesPath}/${safeName}.md`;
    } catch (error) {
      console.error('Invalid URL:', url, error);
      // Fallback to a safe default filename
      const safeName = url.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 100);
      return `${this.notesPath}/${safeName}.md`;
    }
  }

  async getNote(url) {
    const filePath = this.getFilePath(url);
    try {
      const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(filePath)}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.status === 404) {
        // Note doesn't exist yet
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get note: ${response.statusText}`);
      }

      const data = await response.text();
      return data;
    } catch (error) {
      console.error('Error getting note:', error);
      throw error;
    }
  }

  async saveNote(url, title, content) {
    const filePath = this.getFilePath(url);
    
    // Prepare the note content with metadata
    const noteContent = `# ${title}\n\n**URL:** ${url}\n**Date:** ${new Date().toISOString()}\n\n---\n\n${content}`;

    try {
      // Check if note exists
      const existingNote = await this.getNote(url);
      
      if (existingNote === null) {
        // Create new note
        const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(filePath)}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'text/markdown'
          },
          body: noteContent
        });

        if (!response.ok) {
          throw new Error(`Failed to create note: ${response.statusText}`);
        }
      } else {
        // Update existing note - preserve the header but update content
        const headerMatch = existingNote.match(NOTE_HEADER_REGEX);
        let updatedContent;
        
        if (headerMatch) {
          // Update the date in the header
          const newHeader = `# ${title}\n\n**URL:** ${url}\n**Date:** ${new Date().toISOString()}\n\n---\n\n`;
          updatedContent = newHeader + content;
        } else {
          updatedContent = noteContent;
        }

        const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(filePath)}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'text/markdown'
          },
          body: updatedContent
        });

        if (!response.ok) {
          throw new Error(`Failed to update note: ${response.statusText}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  }

  async listAllNotes() {
    try {
      const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(this.notesPath)}/`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list notes: ${response.statusText}`);
      }

      const data = await response.json();
      // The API returns an object with "files" array
      // Handle both array and object formats for compatibility
      const files = Array.isArray(data) ? data : (data.files || []);
      
      // Filter for markdown files only
      const noteFiles = files.filter(file => file.endsWith('.md'));
      
      // Fetch metadata for each note
      const notes = [];
      for (const file of noteFiles) {
        try {
          const filePath = `${this.notesPath}/${file}`;
          const noteResponse = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(filePath)}`, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          });

          if (noteResponse.ok) {
            const content = await noteResponse.text();
            // Parse the header to extract title and URL
            const titleMatch = content.match(/^# (.+)$/m);
            const urlMatch = content.match(/\*\*URL:\*\* (.+)$/m);
            
            if (titleMatch && urlMatch) {
              notes.push({
                filename: file,
                title: titleMatch[1],
                url: urlMatch[1]
              });
            }
          }
        } catch (error) {
          console.error(`Error reading note ${file}:`, error);
        }
      }

      return notes;
    } catch (error) {
      console.error('Error listing notes:', error);
      throw error;
    }
  }
}

class SidePanelApp {
  constructor() {
    this.api = new ObsidianAPI();
    this.currentUrl = '';
    this.currentTitle = '';
    this.isLoading = false;
    this.autoSaveEnabled = true;
    this.autoSaveDelay = 2000; // milliseconds
    this.autoSaveTimeout = null;
    this.isShowingAllNotes = false;
    
    this.elements = {
      pageTitle: document.getElementById('page-title'),
      pageUrl: document.getElementById('page-url'),
      noteEditor: document.getElementById('note-editor'),
      saveBtn: document.getElementById('save-btn'),
      refreshBtn: document.getElementById('refresh-btn'),
      settingsBtn: document.getElementById('settings-btn'),
      connectionStatus: document.getElementById('connection-status'),
      statusMessage: document.getElementById('status-message'),
      lastSaved: document.getElementById('last-saved'),
      allNotesBtn: document.getElementById('all-notes-btn'),
      editorContainer: document.getElementById('editor-container'),
      allNotesContainer: document.getElementById('all-notes-container'),
      allNotesList: document.getElementById('all-notes-list')
    };

    this.init();
  }

  async init() {
    await this.api.loadSettings();
    await this.loadAutoSaveSettings();
    this.attachEventListeners();
    await this.loadCurrentTab();
    await this.checkConnection();
  }

  async loadAutoSaveSettings() {
    try {
      const settings = await chrome.storage.sync.get(['autoSaveEnabled', 'autoSaveDelay']);
      this.autoSaveEnabled = settings.autoSaveEnabled !== undefined ? settings.autoSaveEnabled : true;
      this.autoSaveDelay = (settings.autoSaveDelay || 2) * 1000; // Convert to milliseconds
    } catch (error) {
      console.error('Error loading auto-save settings:', error);
      // Use defaults
      this.autoSaveEnabled = true;
      this.autoSaveDelay = 2000;
    }
  }

  attachEventListeners() {
    this.elements.saveBtn.addEventListener('click', () => this.saveNote());
    this.elements.refreshBtn.addEventListener('click', () => this.loadCurrentTab());
    this.elements.settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    this.elements.allNotesBtn.addEventListener('click', () => this.toggleAllNotes());

    // Auto-save on input
    this.elements.noteEditor.addEventListener('input', () => {
      if (this.autoSaveEnabled) {
        this.scheduleAutoSave();
      }
    });

    // Save notes before the side panel closes or becomes hidden
    const saveOnExit = () => {
      // Cancel any pending auto-save
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
      }
      
      // Save if there's content and we're not already saving
      const content = this.elements.noteEditor.value.trim();
      if (content && this.currentUrl && !this.isLoading) {
        // Trigger save when panel is being closed or hidden
        try {
          this.saveNote(true);
        } catch (error) {
          console.error('Error saving on close:', error);
        }
      }
    };

    // Handle visibility changes (when side panel is hidden but not closed)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        saveOnExit();
      }
    });

    // Handle page unload (when side panel is actually closed)
    window.addEventListener('pagehide', saveOnExit);

    // Listen for tab updates from background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TAB_UPDATED') {
        this.loadCurrentTab();
      }
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && (changes.apiUrl || changes.apiKey || changes.notesPath)) {
        this.onSettingsChanged();
      }
    });
  }

  async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url) {
        this.showError('No active tab found');
        return;
      }

      // Skip chrome:// and other special URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || 
          tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
        this.elements.pageTitle.textContent = 'Cannot take notes for this page';
        this.elements.pageUrl.textContent = '';
        this.elements.noteEditor.disabled = true;
        this.elements.saveBtn.disabled = true;
        return;
      }

      this.currentUrl = tab.url;
      this.currentTitle = tab.title || 'Untitled';
      
      this.elements.pageTitle.textContent = this.currentTitle;
      this.elements.pageUrl.textContent = this.currentUrl;
      this.elements.noteEditor.disabled = false;
      this.elements.saveBtn.disabled = false;

      await this.loadNote();
    } catch (error) {
      console.error('Error loading current tab:', error);
      this.showError('Failed to load current tab');
    }
  }

  async loadNote() {
    if (!this.currentUrl) return;

    this.setLoading(true);
    
    try {
      const note = await this.api.getNote(this.currentUrl);
      
      if (note) {
        // Extract the content after the header
        const contentMatch = note.match(NOTE_HEADER_REGEX);
        const content = contentMatch ? note.substring(contentMatch[0].length) : note;
        this.elements.noteEditor.value = content;
        this.elements.lastSaved.textContent = '✓ Loaded from Obsidian';
      } else {
        this.elements.noteEditor.value = '';
        this.elements.lastSaved.textContent = 'No existing note';
      }
    } catch (error) {
      console.error('Error loading note:', error);
      this.showError('Failed to load note from Obsidian');
    } finally {
      this.setLoading(false);
    }
  }

  scheduleAutoSave() {
    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Schedule new auto-save
    this.autoSaveTimeout = setTimeout(() => {
      this.saveNote(true);
    }, this.autoSaveDelay);
  }

  async saveNote(isAutoSave = false) {
    if (!this.currentUrl) return;

    // Skip if a save is already in progress
    if (this.isLoading) return;

    const content = this.elements.noteEditor.value.trim();
    
    if (!content) {
      if (!isAutoSave) {
        this.showWarning('Note is empty');
      }
      return;
    }

    // Only show loading state for manual saves
    if (!isAutoSave) {
      this.setLoading(true);
    } else {
      // For auto-save, just set the flag to prevent concurrent saves
      this.isLoading = true;
    }
    
    try {
      await this.api.saveNote(this.currentUrl, this.currentTitle, content);
      if (!isAutoSave) {
        this.showSuccess('Note saved to Obsidian!');
      }
      this.elements.lastSaved.textContent = `✓ Saved at ${new Date().toLocaleTimeString()}`;
    } catch (error) {
      console.error('Error saving note:', error);
      if (!isAutoSave) {
        this.showError('Failed to save note. Check your settings.');
      }
    } finally {
      if (!isAutoSave) {
        this.setLoading(false);
      } else {
        this.isLoading = false;
      }
    }
  }

  async checkConnection() {
    const isConnected = await this.api.testConnection();
    
    if (isConnected) {
      this.elements.connectionStatus.textContent = '✓ Connected to Obsidian';
      this.elements.connectionStatus.className = 'connected';
    } else {
      this.elements.connectionStatus.textContent = '⚠️ Not connected - Check settings';
      this.elements.connectionStatus.className = 'warning';
    }
  }

  async onSettingsChanged() {
    // Reload settings from storage
    await this.api.loadSettings();
    
    // Recheck connection with new settings
    await this.checkConnection();
    
    // Reload the current note with new settings
    if (this.currentUrl) {
      await this.loadNote();
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.elements.saveBtn.disabled = loading;
    this.elements.refreshBtn.disabled = loading;
    
    if (loading) {
      this.elements.saveBtn.textContent = 'Saving...';
    } else {
      this.elements.saveBtn.textContent = 'Save to Obsidian';
    }
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showWarning(message) {
    this.showMessage(message, 'info');
  }

  showMessage(message, type) {
    this.elements.statusMessage.textContent = message;
    this.elements.statusMessage.className = `status-message ${type}`;
    
    setTimeout(() => {
      this.elements.statusMessage.className = 'status-message hidden';
    }, 3000);
  }

  async toggleAllNotes() {
    this.isShowingAllNotes = !this.isShowingAllNotes;
    
    if (this.isShowingAllNotes) {
      this.elements.editorContainer.style.display = 'none';
      this.elements.allNotesContainer.style.display = 'flex';
      this.elements.allNotesBtn.textContent = '📝 Current Page';
      await this.loadAllNotes();
    } else {
      this.elements.editorContainer.style.display = 'flex';
      this.elements.allNotesContainer.style.display = 'none';
      this.elements.allNotesBtn.textContent = '📚 All Notes';
    }
  }

  async loadAllNotes() {
    this.elements.allNotesList.innerHTML = '<div class="loading">Loading notes...</div>';
    
    try {
      const notes = await this.api.listAllNotes();
      
      if (notes.length === 0) {
        this.elements.allNotesList.innerHTML = '<div class="empty-state">No notes found. Start taking notes!</div>';
        return;
      }

      this.elements.allNotesList.innerHTML = '';
      
      notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.innerHTML = `
          <div class="note-item-title">${this.escapeHtml(note.title)}</div>
          <div class="note-item-url">${this.escapeHtml(note.url)}</div>
        `;
        
        noteItem.addEventListener('click', () => {
          // Open the URL in a new tab
          chrome.tabs.create({ url: note.url });
        });
        
        this.elements.allNotesList.appendChild(noteItem);
      });
    } catch (error) {
      console.error('Error loading all notes:', error);
      this.elements.allNotesList.innerHTML = '<div class="error-state">Failed to load notes. Check your connection.</div>';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SidePanelApp();
});
