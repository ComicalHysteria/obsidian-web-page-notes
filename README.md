# obsidian-web-page-notes

Unofficial Chrome extension for Obsidian that lets you take notes for webpages in a side panel.

## Features

- 📝 Take notes about any webpage directly in a Chrome side panel
- 🏷️ Custom note titles that are independent of page titles
- 👀 View and edit notes without opening the webpage they were created for
- 🔗 Clickable URLs to easily navigate to associated webpages
- 🔄 Automatically syncs with Obsidian via the Local REST API plugin
- 💾 Saves notes as Markdown files in your Obsidian vault
- 📥 Save entire web pages for offline viewing (archival feature)
- ⚡ Auto-save functionality that saves as you type (configurable)
- 🛡️ Automatic save on exit to prevent data loss when closing the side panel
- 🔍 Retrieves previously created notes for any webpage
- ✏️ Edit and update existing notes seamlessly
- 📚 View all your notes in one place with title and URL listing
- 🌐 Organized by URL with metadata (title, URL, timestamp)

## Prerequisites

1. **Obsidian** - [Download Obsidian](https://obsidian.md/)
2. **Obsidian Local REST API Plugin** - [GitHub Repository](https://github.com/coddingtonbear/obsidian-local-rest-api)

## Installation

### 1. Install the Obsidian Local REST API Plugin

1. Open Obsidian
2. Go to Settings → Community Plugins
3. Disable "Safe mode" if needed
4. Click "Browse" and search for "Local REST API"
5. Install and Enable the plugin
6. Go to Settings → Local REST API
7. Copy your API key (you'll need this later)

### 2. Install the Chrome Extension

#### Option A: From Chrome Web Store (Coming Soon)
_Extension is pending publication_

#### Option B: Load Unpacked (For Development)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the folder containing this extension

### 3. Configure the Extension

1. Click the extension icon in Chrome toolbar
2. Click the settings (⚙️) button
3. Enter your configuration:
   - **API URL**: `http://localhost:27123` (default)
   - **API Key**: Paste the key from Obsidian
   - **Notes Folder**: `WebPageNotes` (or your preferred folder)
   - **Auto-Save**: Enable/disable auto-save (enabled by default)
   - **Auto-Save Delay**: Set delay in seconds (1-30 seconds, default: 2)
4. Click "Test Connection" to verify
5. Click "Save Settings"

## Usage

1. Navigate to any webpage you want to take notes about
2. Click the extension icon or press the extension keyboard shortcut
3. The side panel will open showing any existing notes for that page
4. Set a custom title for your note (or use the default page title)
5. Write or edit your notes in Markdown format
6. Your notes will auto-save as you type (if enabled), or click "Save to Obsidian" to save manually
7. Notes are automatically saved when you close the side panel, preventing data loss
8. Click "💾 Save Page Offline" to download the entire webpage as an HTML file for offline viewing
9. Click "📚 All Notes" to view all your saved notes with their titles and URLs
10. Click on any note in the list to view and edit it directly
11. Click the URL link to open the associated webpage in a new tab
12. Your notes are saved in your Obsidian vault under the configured folder

### Offline Page Archival

The extension allows you to save web pages for offline viewing:
- Click the "💾 Save Page Offline" button in the side panel
- The entire webpage HTML will be downloaded to your computer
- Files are saved with the format: `domain-path_YYYY-MM-DD.html`
- Saved pages can be opened in any browser, even when offline
- Perfect for archiving important pages that might be taken down or for offline access

Example saved filename: `github.com-obsidian-plugin_2026-01-21.html`

### Notes Organization

Notes are automatically organized by URL:
- Filename format: `domain-path.md`
- Each note includes:
  - Custom note title (editable at any time)
  - URL and timestamp metadata
  - Your note content in Markdown

Example: `github.com-obsidian-plugin.md`

## Features in Detail

### Side Panel Interface
- **Note Title Field**: Editable title for each note, independent of page title
- **Current Page Info**: Shows the title and clickable URL of the current page
- **Note Editor**: Markdown-enabled text area for writing notes
- **Auto-Save**: Automatically saves notes as you type (with configurable delay, only in current page mode)
- **Save on Exit**: Automatically saves notes when closing or hiding the side panel (only in current page mode)
- **Save Button**: Manually saves notes to Obsidian
- **Save Page Offline Button**: Downloads the entire webpage as HTML for offline viewing and archival
- **Refresh Button**: Reloads the note from Obsidian
- **All Notes View**: Click to view all your saved notes; click any note to view and edit it
- **Viewing Modes**: 
  - **Current Mode**: Viewing notes for the active browser tab (auto-updates on tab change)
  - **Saved Mode**: Viewing a saved note from All Notes (no auto-updates, manual save required)
- **Connection Status**: Shows real-time connection status to Obsidian

### Settings Page
- Configure Obsidian API connection
- Test connection to verify setup
- Customize notes folder location
- Enable/disable auto-save functionality
- Configure auto-save delay (1-30 seconds)
- Clear and helpful setup instructions

## Troubleshooting

### Connection Issues
- Make sure Obsidian is running
- Verify the Local REST API plugin is enabled
- Check that the API URL is correct (default: `http://localhost:27123`)
- Confirm your API key is correct
- Ensure no firewall is blocking localhost connections

### Notes Not Saving
- Check connection status in the side panel
- Verify the notes folder exists in your vault
- Review the API key permissions in Obsidian settings

### Extension Not Working
- Refresh the extension in `chrome://extensions/`
- Check browser console for errors (F12 → Console)
- Verify you're on a valid webpage (not chrome:// URLs)

## Development

### Project Structure
```
obsidian-web-page-notes/
├── manifest.json          # Chrome extension manifest
├── background.js          # Background service worker
├── sidepanel.html         # Side panel UI
├── sidepanel.js           # Side panel logic
├── sidepanel.css          # Side panel styles
├── options.html           # Settings page UI
├── options.js             # Settings page logic
├── options.css            # Settings page styles
└── icons/                 # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Tech Stack
- Vanilla JavaScript (no frameworks)
- Chrome Extensions Manifest V3
- Chrome Side Panel API
- Obsidian Local REST API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- [Obsidian](https://obsidian.md/) - The knowledge base application
- [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) - Plugin that makes this extension possible

## Disclaimer

This is an unofficial extension and is not affiliated with Obsidian.md.
