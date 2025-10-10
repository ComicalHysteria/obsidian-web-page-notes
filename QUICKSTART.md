# Quick Start Guide

## Installation Steps

### 1. Install Obsidian Local REST API Plugin
1. Open Obsidian
2. Settings → Community Plugins
3. Turn off "Safe mode"
4. Click "Browse" and search for "Local REST API"
5. Click "Install" then "Enable"

### 2. Get Your API Key
1. In Obsidian: Settings → Local REST API
2. Click "Show API Key" 
3. Copy the API key (you'll need it in step 4)

### 3. Install This Extension
1. Download or clone this repository
2. Open Chrome
3. Go to `chrome://extensions/`
4. Turn on "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the extension folder

### 4. Configure Extension
1. Click the extension icon in Chrome
2. Click the settings icon (⚙️)
3. Enter your API key from step 2
4. Click "Test Connection" to verify
5. Click "Save Settings"

## Using the Extension

1. Navigate to any webpage
2. Click the extension icon
3. Write your notes in Markdown
4. Click "Save to Obsidian"
5. Your notes are now in your Obsidian vault!

## Default Settings

- **API URL**: `http://localhost:27123`
- **Notes Folder**: `WebPageNotes`

You can customize these in the settings page.

## Troubleshooting

**Can't connect?**
- Make sure Obsidian is running
- Verify the Local REST API plugin is enabled
- Check your API key is correct

**Notes not saving?**
- The notes folder must exist in your vault
- Create it manually or let the extension create it on first save

**Extension icon grayed out?**
- Some pages (chrome://, edge://) cannot have notes taken for security reasons
- Try a regular webpage like github.com

## Need Help?

Check the full [README.md](README.md) for detailed documentation.
