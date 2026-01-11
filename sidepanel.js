// Side panel script for Obsidian Web Page Notes

// Constants
const NOTE_HEADER_REGEX = /^(# .*?\n\n\*\*URL:\*\*.*?\n\*\*Date:\*\*.*?\n\n---\n\n)/s;
const NOTE_METADATA_REGEX = /^# (.+)\n\n\*\*URL:\*\* (.+)\n\*\*Date:\*\* (.+)\n\n---\n\n/s;
const DEFAULT_TITLE = 'Untitled';
const PLACEHOLDER_URL = '#';
const OTHER_DOMAIN_GROUP = 'Other';
const TOGGLE_ICON_EXPANDED = '▼';
const TOGGLE_ICON_COLLAPSED = '▶';

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
      
      // Fetch metadata and content for each note
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
              // Extract note content (everything after the header)
              const metadataMatch = content.match(NOTE_METADATA_REGEX);
              const noteContent = metadataMatch ? content.substring(metadataMatch[0].length).trim() : content;
              
              notes.push({
                filename: file,
                title: titleMatch[1],
                url: urlMatch[1],
                content: noteContent
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
    this.currentUrl = ''; // URL for saving the note
    this.currentPageTitle = ''; // Original page title
    this.noteTitle = ''; // Custom note title set by user
    this.savedNoteTitle = ''; // Last saved note title
    this.noteTitleChanged = false; // Track if title has unsaved changes
    this.isLoading = false;
    this.autoSaveEnabled = true;
    this.autoSaveDelay = 2000; // milliseconds
    this.autoSaveTimeout = null;
    this.currentView = 'current'; // 'current', 'all', or 'domain'
    this.viewingMode = 'current'; // 'current' or 'saved'
    this.titleUpdateTimeout = null; // For reverting visual feedback
    this.allNotes = []; // Store all notes for filtering
    this.allNotesSearchTimeout = null; // For debouncing all notes search input
    this.domainNotesSearchTimeout = null; // For debouncing domain notes search input
    this.domainGroups = {}; // Store notes grouped by domain
    this.collapsedDomains = new Set(); // Track collapsed domain groups
    
    this.elements = {
      pageTitle: document.getElementById('page-title'),
      pageUrl: document.getElementById('page-url'),
      noteTitleInput: document.getElementById('note-title-input'),
      noteTitleStatus: document.getElementById('note-title-status'),
      noteEditor: document.getElementById('note-editor'),
      saveBtn: document.getElementById('save-btn'),
      refreshBtn: document.getElementById('refresh-btn'),
      settingsBtn: document.getElementById('settings-btn'),
      connectionStatus: document.getElementById('connection-status'),
      statusMessage: document.getElementById('status-message'),
      lastSaved: document.getElementById('last-saved'),
      viewSelectorBtn: document.getElementById('view-selector-btn'),
      viewSelectorText: document.getElementById('view-selector-text'),
      viewDropdownMenu: document.getElementById('view-dropdown-menu'),
      editorContainer: document.getElementById('editor-container'),
      allNotesContainer: document.getElementById('all-notes-container'),
      allNotesList: document.getElementById('all-notes-list'),
      notesSearchInput: document.getElementById('notes-search-input'),
      domainNotesContainer: document.getElementById('domain-notes-container'),
      domainNotesList: document.getElementById('domain-notes-list'),
      domainNotesSearchInput: document.getElementById('domain-notes-search-input')
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
    this.elements.refreshBtn.addEventListener('click', () => this.refreshNote());
    this.elements.settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    
    // View selector dropdown
    this.elements.viewSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleViewDropdown();
    });

    // Dropdown menu items
    const dropdownItems = this.elements.viewDropdownMenu.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const view = item.getAttribute('data-view');
        this.switchView(view);
        this.hideViewDropdown();
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.elements.viewDropdownMenu.classList.contains('hidden')) {
        this.hideViewDropdown();
      }
    });

    // Auto-save on input
    this.elements.noteEditor.addEventListener('input', () => {
      if (this.autoSaveEnabled && this.viewingMode === 'current') {
        this.scheduleAutoSave();
      }
    });

    // Handle note title changes
    this.elements.noteTitleInput.addEventListener('input', () => {
      const currentValue = this.elements.noteTitleInput.value.trim();
      
      // Check if title has changed from saved state
      if (currentValue !== this.savedNoteTitle) {
        this.noteTitleChanged = true;
        this.setNoteTitleStatus('unsaved');
      } else {
        this.noteTitleChanged = false;
        this.setNoteTitleStatus('');
      }
    });

    // Handle Enter key to save title
    this.elements.noteTitleInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await this.saveNoteTitle();
        this.elements.noteTitleInput.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelNoteTitleEdit();
        this.elements.noteTitleInput.blur();
      }
    });

    // Handle URL click to open page
    this.elements.pageUrl.addEventListener('click', (e) => {
      e.preventDefault();
      const url = this.elements.pageUrl.href;
      if (url && url !== PLACEHOLDER_URL) {
        chrome.tabs.create({ url: url });
      }
    });

    // Save notes before the side panel closes or becomes hidden
    const saveOnExit = () => {
      // Cancel any pending auto-save
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
      }
      
      // Save if there's content and we're not already saving and in current mode
      const content = this.elements.noteEditor.value.trim();
      if (content && this.currentUrl && !this.isLoading && this.viewingMode === 'current') {
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
      if (message.type === 'TAB_UPDATED' && this.viewingMode === 'current') {
        // Only auto-update if we're in current page mode
        this.loadCurrentTab();
      }
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && (changes.apiUrl || changes.apiKey || changes.notesPath)) {
        this.onSettingsChanged();
      }
    });

    // Handle search input for filtering notes in All Notes view
    this.elements.notesSearchInput.addEventListener('input', () => {
      // Debounce the search to avoid excessive filtering
      if (this.allNotesSearchTimeout) {
        clearTimeout(this.allNotesSearchTimeout);
      }
      this.allNotesSearchTimeout = setTimeout(() => {
        this.filterNotes();
      }, 150); // 150ms debounce delay
    });

    // Handle search input for filtering notes in Domain Notes view
    this.elements.domainNotesSearchInput.addEventListener('input', () => {
      // Debounce the search to avoid excessive filtering
      if (this.domainNotesSearchTimeout) {
        clearTimeout(this.domainNotesSearchTimeout);
      }
      this.domainNotesSearchTimeout = setTimeout(() => {
        this.filterDomainNotes();
      }, 150); // 150ms debounce delay
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
        this.elements.pageUrl.href = PLACEHOLDER_URL;
        this.elements.noteEditor.disabled = true;
        this.elements.saveBtn.disabled = true;
        this.elements.noteTitleInput.disabled = true;
        return;
      }

      this.currentUrl = tab.url;
      this.currentPageTitle = tab.title || DEFAULT_TITLE;
      this.viewingMode = 'current';
      
      this.elements.pageTitle.textContent = this.currentPageTitle;
      this.elements.pageUrl.textContent = this.currentUrl;
      this.elements.pageUrl.href = this.currentUrl;
      this.elements.noteEditor.disabled = false;
      this.elements.saveBtn.disabled = false;
      this.elements.noteTitleInput.disabled = false;

      await this.loadNote();
    } catch (error) {
      console.error('Error loading current tab:', error);
      this.showError('Failed to load current tab');
    }
  }

  async refreshNote() {
    if (this.viewingMode === 'current') {
      await this.loadCurrentTab();
    } else if (this.viewingMode === 'saved') {
      // Reload the saved note using current URL
      await this.loadSavedNote(this.currentUrl);
    }
  }

  async loadNote() {
    if (!this.currentUrl) return;

    this.setLoading(true);
    
    try {
      const note = await this.api.getNote(this.currentUrl);
      
      if (note) {
        // Extract the metadata and content
        const metadataMatch = note.match(NOTE_METADATA_REGEX);
        if (metadataMatch) {
          const noteTitle = metadataMatch[1];
          const content = note.substring(metadataMatch[0].length);
          
          // Set the note title
          this.noteTitle = noteTitle;
          this.savedNoteTitle = noteTitle;
          this.elements.noteTitleInput.value = noteTitle;
          this.elements.noteEditor.value = content;
        } else {
          // Fallback for notes without proper metadata
          const contentMatch = note.match(NOTE_HEADER_REGEX);
          const content = contentMatch ? note.substring(contentMatch[0].length) : note;
          this.elements.noteEditor.value = content;
          this.noteTitle = this.currentPageTitle;
          this.savedNoteTitle = this.currentPageTitle;
          this.elements.noteTitleInput.value = this.currentPageTitle;
        }
        this.noteTitleChanged = false;
        this.setNoteTitleStatus('');
        this.elements.lastSaved.textContent = '✓ Loaded from Obsidian';
      } else {
        this.elements.noteEditor.value = '';
        this.noteTitle = this.currentPageTitle;
        this.savedNoteTitle = this.currentPageTitle;
        this.elements.noteTitleInput.value = this.currentPageTitle;
        this.noteTitleChanged = false;
        this.setNoteTitleStatus('');
        this.elements.lastSaved.textContent = 'No existing note';
      }
    } catch (error) {
      console.error('Error loading note:', error);
      this.showError('Failed to load note from Obsidian');
    } finally {
      this.setLoading(false);
    }
  }

  async loadSavedNote(url) {
    if (!url) return;

    this.setLoading(true);
    this.viewingMode = 'saved';
    
    try {
      const note = await this.api.getNote(url);
      
      if (note) {
        // Extract the metadata and content
        const metadataMatch = note.match(NOTE_METADATA_REGEX);
        if (metadataMatch) {
          const noteTitle = metadataMatch[1];
          const noteUrl = metadataMatch[2];
          const content = note.substring(metadataMatch[0].length);
          
          // Set the note title and URL
          this.noteTitle = noteTitle;
          this.savedNoteTitle = noteTitle;
          // Use the URL from note metadata for saving (not the lookup URL)
          // This preserves the original URL even if the note was found via different path
          this.currentUrl = noteUrl;
          this.currentPageTitle = noteTitle; // Store as fallback
          
          this.elements.noteTitleInput.value = noteTitle;
          this.elements.pageTitle.textContent = noteTitle;
          this.elements.pageUrl.textContent = noteUrl;
          this.elements.pageUrl.href = noteUrl;
          this.elements.noteEditor.value = content;
        } else {
          // Fallback for notes without proper metadata
          const contentMatch = note.match(NOTE_HEADER_REGEX);
          const content = contentMatch ? note.substring(contentMatch[0].length) : note;
          
          this.currentUrl = url;
          this.currentPageTitle = DEFAULT_TITLE;
          this.noteTitle = DEFAULT_TITLE;
          this.savedNoteTitle = DEFAULT_TITLE;
          
          this.elements.noteEditor.value = content;
          this.elements.noteTitleInput.value = DEFAULT_TITLE;
          this.elements.pageTitle.textContent = DEFAULT_TITLE;
          this.elements.pageUrl.textContent = url;
          this.elements.pageUrl.href = url;
        }
        this.noteTitleChanged = false;
        this.setNoteTitleStatus('');
        this.elements.noteEditor.disabled = false;
        this.elements.saveBtn.disabled = false;
        this.elements.noteTitleInput.disabled = false;
        this.elements.lastSaved.textContent = '✓ Viewing saved note';
      } else {
        this.showError('Failed to load saved note');
      }
    } catch (error) {
      console.error('Error loading saved note:', error);
      this.showError('Failed to load saved note from Obsidian');
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

    // Get the note title - use custom title if set, otherwise use page title
    const titleToSave = this.noteTitle || this.currentPageTitle || DEFAULT_TITLE;

    // Only show loading state for manual saves
    if (!isAutoSave) {
      this.setLoading(true);
    } else {
      // For auto-save, just set the flag to prevent concurrent saves
      this.isLoading = true;
    }
    
    try {
      await this.api.saveNote(this.currentUrl, titleToSave, content);
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

  setNoteTitleStatus(status) {
    // Clear any existing timeout
    if (this.titleUpdateTimeout) {
      clearTimeout(this.titleUpdateTimeout);
      this.titleUpdateTimeout = null;
    }

    // Remove all status classes
    this.elements.noteTitleInput.classList.remove('unsaved', 'updated');
    this.elements.noteTitleStatus.classList.remove('unsaved', 'updated');

    if (status === 'unsaved') {
      this.elements.noteTitleInput.classList.add('unsaved');
      this.elements.noteTitleStatus.classList.add('unsaved');
      this.elements.noteTitleStatus.textContent = 'UNSAVED CHANGES';
    } else if (status === 'updated') {
      this.elements.noteTitleInput.classList.add('updated');
      this.elements.noteTitleStatus.classList.add('updated');
      this.elements.noteTitleStatus.textContent = 'UPDATED';
      
      // Revert to normal after 3 seconds
      this.titleUpdateTimeout = setTimeout(() => {
        this.elements.noteTitleInput.classList.remove('updated');
        this.elements.noteTitleStatus.classList.remove('updated');
        this.elements.noteTitleStatus.textContent = '';
      }, 3000);
    } else {
      this.elements.noteTitleStatus.textContent = '';
    }
  }

  async saveNoteTitle() {
    // No changes to save
    if (!this.noteTitleChanged) {
      return;
    }

    const newTitle = this.elements.noteTitleInput.value.trim();
    
    if (!newTitle) {
      this.showWarning('Title cannot be empty');
      return;
    }

    // Update the note title
    this.noteTitle = newTitle;
    this.savedNoteTitle = newTitle;
    this.noteTitleChanged = false;

    // Save the note with the new title if there's content
    // If no content yet, title will be used when content is first saved
    if (this.currentUrl) {
      try {
        const content = this.elements.noteEditor.value.trim();
        if (content) {
          await this.api.saveNote(this.currentUrl, newTitle, content);
        }
        this.setNoteTitleStatus('updated');
      } catch (error) {
        console.error('Error saving note title:', error);
        this.showError('Failed to save title');
      }
    } else {
      // Just update the status if no URL set yet
      this.setNoteTitleStatus('updated');
    }
  }

  cancelNoteTitleEdit() {
    // Reset to saved title
    this.elements.noteTitleInput.value = this.savedNoteTitle;
    this.noteTitle = this.savedNoteTitle;
    this.noteTitleChanged = false;
    this.setNoteTitleStatus('');
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

  toggleViewDropdown() {
    const isHidden = this.elements.viewDropdownMenu.classList.contains('hidden');
    if (isHidden) {
      this.elements.viewDropdownMenu.classList.remove('hidden');
      this.elements.viewSelectorBtn.classList.add('open');
      this.updateDropdownActiveState();
    } else {
      this.hideViewDropdown();
    }
  }

  hideViewDropdown() {
    this.elements.viewDropdownMenu.classList.add('hidden');
    this.elements.viewSelectorBtn.classList.remove('open');
  }

  updateDropdownActiveState() {
    const dropdownItems = this.elements.viewDropdownMenu.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
      const view = item.getAttribute('data-view');
      if (view === this.currentView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  switchView(view) {
    this.currentView = view;
    
    // Update button text
    const viewLabels = {
      'current': '📝 Current Note',
      'all': '📚 All Notes',
      'domain': '🌐 Domain Notes'
    };
    this.elements.viewSelectorText.textContent = viewLabels[view];

    // Hide all containers
    this.elements.editorContainer.style.display = 'none';
    this.elements.allNotesContainer.style.display = 'none';
    this.elements.domainNotesContainer.style.display = 'none';

    // Show the selected view
    switch (view) {
      case 'current':
        this.elements.editorContainer.style.display = 'flex';
        break;
      case 'all':
        this.elements.allNotesContainer.style.display = 'flex';
        this.loadAllNotes();
        break;
      case 'domain':
        this.elements.domainNotesContainer.style.display = 'flex';
        this.loadDomainNotes();
        break;
    }
  }

  async loadAllNotes() {
    this.elements.allNotesList.innerHTML = '<div class="loading">Loading notes...</div>';
    
    try {
      const notes = await this.api.listAllNotes();
      this.allNotes = notes;
      
      if (this.allNotes.length === 0) {
        this.elements.allNotesList.innerHTML = '<div class="empty-state">No notes found. Start taking notes!</div>';
        return;
      }

      // Clear search input when loading
      this.elements.notesSearchInput.value = '';
      this.renderNotes(this.allNotes);
    } catch (error) {
      console.error('Error loading all notes:', error);
      this.elements.allNotesList.innerHTML = '<div class="error-state">Failed to load notes. Check your connection.</div>';
    }
  }

  async loadDomainNotes() {
    this.elements.domainNotesList.innerHTML = '<div class="loading">Loading notes...</div>';
    
    try {
      const notes = await this.api.listAllNotes();
      this.allNotes = notes;
      
      if (this.allNotes.length === 0) {
        this.elements.domainNotesList.innerHTML = '<div class="empty-state">No notes found. Start taking notes!</div>';
        return;
      }

      // Clear search input when loading
      this.elements.domainNotesSearchInput.value = '';
      
      // Group notes by domain
      this.groupNotesByDomain(this.allNotes);
      this.renderDomainNotes();
    } catch (error) {
      console.error('Error loading domain notes:', error);
      this.elements.domainNotesList.innerHTML = '<div class="error-state">Failed to load notes. Check your connection.</div>';
    }
  }

  groupNotesByDomain(notes) {
    this.domainGroups = {};
    
    notes.forEach(note => {
      try {
        const url = new URL(note.url);
        const domain = url.hostname.replace(/^www\./, '');
        
        if (!this.domainGroups[domain]) {
          this.domainGroups[domain] = [];
        }
        this.domainGroups[domain].push(note);
      } catch (error) {
        console.error('Invalid URL in note:', note.url, error);
        // Group invalid URLs under "Other"
        if (!this.domainGroups[OTHER_DOMAIN_GROUP]) {
          this.domainGroups[OTHER_DOMAIN_GROUP] = [];
        }
        this.domainGroups[OTHER_DOMAIN_GROUP].push(note);
      }
    });
  }

  renderDomainNotes() {
    this.elements.domainNotesList.innerHTML = '';
    
    // Sort domains alphabetically
    const sortedDomains = Object.keys(this.domainGroups).sort();
    
    sortedDomains.forEach(domain => {
      const notes = this.domainGroups[domain];
      const isCollapsed = this.collapsedDomains.has(domain);
      
      // Create domain group container
      const domainGroup = document.createElement('div');
      domainGroup.className = 'domain-group';
      
      // Create domain header
      const domainHeader = document.createElement('div');
      domainHeader.className = `domain-group-header${isCollapsed ? ' collapsed' : ''}`;
      domainHeader.innerHTML = `
        <span class="toggle-icon">${isCollapsed ? TOGGLE_ICON_COLLAPSED : TOGGLE_ICON_EXPANDED}</span>
        <span class="domain-name">${this.escapeHtml(domain)}</span>
        <span class="note-count">${notes.length} note${notes.length !== 1 ? 's' : ''}</span>
      `;
      
      // Toggle collapse on header click
      domainHeader.addEventListener('click', () => {
        const notesContainer = domainHeader.nextElementSibling;
        const toggleIcon = domainHeader.querySelector('.toggle-icon');
        if (this.collapsedDomains.has(domain)) {
          this.collapsedDomains.delete(domain);
          domainHeader.classList.remove('collapsed');
          notesContainer.classList.remove('collapsed');
          toggleIcon.textContent = TOGGLE_ICON_EXPANDED;
        } else {
          this.collapsedDomains.add(domain);
          domainHeader.classList.add('collapsed');
          notesContainer.classList.add('collapsed');
          toggleIcon.textContent = TOGGLE_ICON_COLLAPSED;
        }
      });
      
      // Create notes container
      const notesContainer = document.createElement('div');
      notesContainer.className = `domain-group-notes${isCollapsed ? ' collapsed' : ''}`;
      
      // Add notes to the container
      notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.innerHTML = `
          <div class="note-item-title">${this.escapeHtml(note.title)}</div>
          <div class="note-item-url">${this.escapeHtml(note.url)}</div>
        `;
        
        noteItem.addEventListener('click', async () => {
          // Switch back to editor view and load the note
          this.currentView = 'current';
          this.elements.viewSelectorText.textContent = '📝 Current Note';
          this.elements.editorContainer.style.display = 'flex';
          this.elements.domainNotesContainer.style.display = 'none';
          
          // Load the saved note
          await this.loadSavedNote(note.url);
        });
        
        notesContainer.appendChild(noteItem);
      });
      
      domainGroup.appendChild(domainHeader);
      domainGroup.appendChild(notesContainer);
      this.elements.domainNotesList.appendChild(domainGroup);
    });
  }

  filterDomainNotes() {
    const query = this.elements.domainNotesSearchInput.value.trim().toLowerCase();
    
    if (!query) {
      // Show all notes if search is empty
      this.groupNotesByDomain(this.allNotes);
      this.renderDomainNotes();
      return;
    }

    const filteredNotes = this.searchAndScoreNotes(query, this.allNotes);

    if (filteredNotes.length === 0) {
      this.elements.domainNotesList.innerHTML = '<div class="empty-state">No notes match your search.</div>';
    } else {
      this.groupNotesByDomain(filteredNotes);
      this.renderDomainNotes();
    }
  }

  async toggleAllNotes() {
    // Legacy method for backward compatibility - redirect to switchView
    // Note: This only handles 'current' and 'all' views, not 'domain'
    if (this.currentView === 'current') {
      this.switchView('all');
    } else {
      this.switchView('current');
    }
  }

  filterNotes() {
    const query = this.elements.notesSearchInput.value.trim().toLowerCase();
    
    if (!query) {
      // Show all notes if search is empty
      this.renderNotes(this.allNotes);
      return;
    }

    const filteredNotes = this.searchAndScoreNotes(query, this.allNotes);

    if (filteredNotes.length === 0) {
      this.elements.allNotesList.innerHTML = '<div class="empty-state">No notes match your search.</div>';
    } else {
      this.renderNotes(filteredNotes);
    }
  }

  searchAndScoreNotes(query, notes) {
    // Filter and score notes based on matches
    const scoredNotes = notes.map(note => {
      let score = 0;
      const titleLower = note.title.toLowerCase();
      const urlLower = note.url.toLowerCase();
      // Limit content search to first 1000 characters for performance
      const contentLower = note.content.substring(0, 1000).toLowerCase();

      // Title matches (highest priority - score 3)
      if (titleLower.includes(query)) {
        score += 3;
        // Bonus if it's at the start of title
        if (titleLower.startsWith(query)) {
          score += 2;
        }
      }

      // URL matches (medium priority - score 2)
      if (urlLower.includes(query)) {
        score += 2;
      }

      // Content matches (lowest priority - score 1)
      if (contentLower.includes(query)) {
        score += 1;
      }

      return { note, score };
    });

    // Filter notes with score > 0 and sort by score (descending)
    return scoredNotes
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.note);
  }

  renderNotes(notes) {
    this.elements.allNotesList.innerHTML = '';
    
    notes.forEach(note => {
      const noteItem = document.createElement('div');
      noteItem.className = 'note-item';
      noteItem.innerHTML = `
        <div class="note-item-title">${this.escapeHtml(note.title)}</div>
        <div class="note-item-url">${this.escapeHtml(note.url)}</div>
      `;
      
      noteItem.addEventListener('click', async () => {
        // Switch back to editor view and load the note
        this.currentView = 'current';
        this.elements.viewSelectorText.textContent = '📝 Current Note';
        this.elements.editorContainer.style.display = 'flex';
        this.elements.allNotesContainer.style.display = 'none';
        
        // Load the saved note
        await this.loadSavedNote(note.url);
      });
      
      this.elements.allNotesList.appendChild(noteItem);
    });
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
