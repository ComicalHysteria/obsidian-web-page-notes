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
