// Background service worker for the Obsidian Web Page Notes extension

// Open side panel when action is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for tab updates to refresh side panel if needed
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Side panel will handle its own refresh
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Notify side panel about URL change if it's open
    chrome.runtime.sendMessage({
      type: 'TAB_UPDATED',
      url: tab.url,
      title: tab.title
    }).catch(() => {
      // Side panel might not be open, ignore error
    });
  }
});

// Handle persistent port connections from side panel
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    console.log('Side panel connected');
    
    let pendingSaveData = null;
    
    // Listen for messages from the side panel
    port.onMessage.addListener(async (message) => {
      if (message.type === 'SAVE_ON_EXIT') {
        // Store the save data to process when port disconnects
        pendingSaveData = message;
        console.log('Received save request, will process on disconnect');
      }
    });
    
    // Handle port disconnection - side panel is closing
    port.onDisconnect.addListener(async () => {
      console.log('Side panel disconnected');
      
      // If there's pending save data, process it now
      if (pendingSaveData) {
        console.log('Processing pending save on disconnect');
        try {
          await performSave(pendingSaveData);
          console.log('Save completed successfully');
        } catch (error) {
          console.error('Error saving on disconnect:', error);
        }
      }
    });
  }
});

// Helper function to perform the save operation
async function performSave(data) {
  const { url, title, content } = data;
  
  // Load settings
  const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'notesPath']);
  const baseUrl = settings.apiUrl || 'http://localhost:27123';
  const apiKey = settings.apiKey || '';
  const notesPath = settings.notesPath || 'WebPageNotes';
  
  // Create file path
  const filePath = getFilePath(url, notesPath);
  
  // Prepare note content
  const noteContent = `# ${title}\n\n**URL:** ${url}\n**Date:** ${new Date().toISOString()}\n\n---\n\n${content}`;
  
  // Check if note exists
  const existingNote = await getNote(baseUrl, apiKey, filePath);
  
  if (existingNote === null) {
    // Create new note
    const response = await fetch(`${baseUrl}/vault/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'text/markdown'
      },
      body: noteContent
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create note: ${response.statusText}`);
    }
  } else {
    // Update existing note
    const NOTE_HEADER_REGEX = /^(# .*?\n\n\*\*URL:\*\*.*?\n\*\*Date:\*\*.*?\n\n---\n\n)/s;
    const headerMatch = existingNote.match(NOTE_HEADER_REGEX);
    let updatedContent;
    
    if (headerMatch) {
      const newHeader = `# ${title}\n\n**URL:** ${url}\n**Date:** ${new Date().toISOString()}\n\n---\n\n`;
      updatedContent = newHeader + content;
    } else {
      updatedContent = noteContent;
    }
    
    const response = await fetch(`${baseUrl}/vault/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'text/markdown'
      },
      body: updatedContent
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update note: ${response.statusText}`);
    }
  }
}

async function getNote(baseUrl, apiKey, filePath) {
  try {
    const response = await fetch(`${baseUrl}/vault/${encodeURIComponent(filePath)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get note: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error getting note:', error);
    throw error;
  }
}

function getFilePath(url, notesPath) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const path = urlObj.pathname.replace(/\//g, '-').replace(/^-/, '').replace(/-$/, '') || 'index';
    const safeName = `${domain}${path}`.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${notesPath}/${safeName}.md`;
  } catch (error) {
    console.error('Invalid URL:', url, error);
    const safeName = url.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 100);
    return `${notesPath}/${safeName}.md`;
  }
}

