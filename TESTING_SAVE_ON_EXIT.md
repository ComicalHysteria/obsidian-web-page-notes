# Manual Testing Guide: Save on Exit Feature

## Feature Description
This feature ensures that notes are automatically saved when the side panel is closed or becomes hidden, preventing data loss if the user closes the panel before the auto-save timer triggers.

## Implementation Details
The feature uses a **persistent port connection** for reliable save-on-exit:

### Primary Mechanism: Persistent Port
1. **Port Connection** - Side panel establishes a persistent connection to the background script on initialization
2. **Save Request** - When closing, the side panel sends save data through the port
3. **Port Disconnection** - When the side panel closes, the port automatically disconnects
4. **Background Save** - The background script detects disconnection and performs the save operation

This approach is more reliable because:
- Background scripts persist longer than page contexts
- The browser gives background scripts adequate time to complete operations
- Port disconnection is a guaranteed event in Chrome extensions

### Fallback Mechanisms
The implementation also keeps event-based saves as fallbacks:
1. **visibilitychange** - Triggers when the side panel becomes hidden
2. **pagehide** - Triggers when the side panel is unloaded/closed

Both mechanisms will:
- Cancel any pending auto-save timeout
- Send save request through the port (primary)
- Attempt direct save (fallback, may not complete in time)
- Save only if there's content, a valid URL, and no save in progress

## How to Test

### Prerequisites
1. Load the extension in Chrome (chrome://extensions/ → Load unpacked)
2. Have Obsidian running with the Local REST API plugin configured
3. Configure the extension with valid API credentials

### Test Case 1: Close Side Panel Before Auto-Save
1. Open the side panel on any webpage
2. Type some notes in the editor
3. Immediately close the side panel (before the 2-second auto-save triggers)
4. Open Obsidian and verify the notes were saved

**Expected Result:** The notes should be present in Obsidian, even though you closed the panel quickly.

### Test Case 2: Switch Away from Side Panel
1. Open the side panel on any webpage
2. Type some notes in the editor
3. Click elsewhere in Chrome to hide the side panel
4. Check Obsidian to see if notes were saved

**Expected Result:** Notes should be saved when the panel becomes hidden.

### Test Case 3: Empty Notes Should Not Save
1. Open the side panel on any webpage
2. Leave the note editor empty or delete all content
3. Close the side panel

**Expected Result:** No new file should be created or existing file should not be modified.

### Test Case 4: Verify No Duplicate Saves
1. Open the side panel on any webpage
2. Type some notes
3. Wait for the auto-save to complete (check the "✓ Saved at" message)
4. Close the side panel immediately

**Expected Result:** Only one save should occur (the auto-save), not a duplicate save on close.

### Test Case 5: Multiple Tabs
1. Open the side panel
2. Type notes on one webpage
3. Switch to a different tab (this will change the URL in the panel)
4. Go back to the original tab
5. Close the side panel

**Expected Result:** Notes should be saved for the last active webpage.

## Debugging
- Open Chrome DevTools (F12) while the side panel is open
- Check the Console tab for messages and errors
- Look for these key messages:
  - "Side panel connected" - Port connection established
  - "Received save request, will process on disconnect" - Save data buffered
  - "Side panel disconnected" - Port disconnected (panel closing)
  - "Processing pending save on disconnect" - Background save starting
  - "Save completed successfully" - Background save succeeded
  - "Error saving on disconnect:" - Background save failed
- You can also check the background script console:
  1. Go to chrome://extensions/
  2. Find "Obsidian Web Page Notes"
  3. Click "service worker" link to open background script console

## Notes
- The save-on-exit feature works independently of the auto-save setting
- Even if auto-save is disabled in settings, notes will still be saved when you close the panel
- This provides an extra layer of protection against data loss
- The feature uses a **persistent port connection** for maximum reliability
- The background script performs the actual save, which has more time to complete than the side panel context
- A fallback direct save is also attempted but may not complete in time for very quick closes
