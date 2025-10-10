# obsidian-web-page-notes

Unofficial Chrome extension for Obsidian that lets you take notes for webpages in a side panel.

## Features

- 📝 Take notes about any webpage directly in a Chrome side panel
- 🔄 Automatically syncs with Obsidian via the Local REST API plugin
- 💾 Saves notes as Markdown files in your Obsidian vault
- 🔍 Retrieves previously created notes for any webpage
- ✏️ Edit and update existing notes seamlessly
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
4. Click "Test Connection" to verify
5. Click "Save Settings"

## Usage

1. Navigate to any webpage you want to take notes about
2. Click the extension icon or press the extension keyboard shortcut
3. The side panel will open showing any existing notes for that page
4. Write or edit your notes in Markdown format
5. Click "Save to Obsidian" to sync your notes
6. Your notes are saved in your Obsidian vault under the configured folder

### Notes Organization

Notes are automatically organized by URL:
- Filename format: `domain-path.md`
- Each note includes:
  - Page title as heading
  - URL and timestamp metadata
  - Your note content in Markdown

Example: `github.com-obsidian-plugin.md`

## Features in Detail

### Side Panel Interface
- **Current Page Info**: Shows the title and URL of the current page
- **Note Editor**: Markdown-enabled text area for writing notes
- **Save Button**: Saves notes to Obsidian
- **Refresh Button**: Reloads the note from Obsidian
- **Connection Status**: Shows real-time connection status to Obsidian

### Settings Page
- Configure Obsidian API connection
- Test connection to verify setup
- Customize notes folder location
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
