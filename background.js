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

// Handle messages from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_PAGE_HTML') {
    // Use async function to handle the request
    (async () => {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: message.tabId },
          func: () => {
            // Get the full HTML including DOCTYPE
            return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
          }
        });

        if (results && results[0] && results[0].result) {
          sendResponse({ success: true, html: results[0].result });
        } else {
          sendResponse({ success: false, error: 'Could not capture page content' });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});
