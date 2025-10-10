# Contributing to Obsidian Web Page Notes

Thank you for your interest in contributing! This extension is built with vanilla JavaScript to keep it simple and lightweight.

## Development Setup

1. Clone the repository
2. Make your changes
3. Test by loading the extension unpacked in Chrome (`chrome://extensions/`)
4. Submit a pull request

## Project Structure

```
obsidian-web-page-notes/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Background service worker
├── sidepanel.html         # Side panel UI
├── sidepanel.js           # Side panel logic and API integration
├── sidepanel.css          # Side panel styles
├── options.html           # Settings page UI
├── options.js             # Settings page logic
├── options.css            # Settings page styles
└── icons/                 # Extension icons
```

## Code Style

- Use vanilla JavaScript (no frameworks)
- Follow existing code style and patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

## Testing

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Side panel opens when clicking the extension icon
- [ ] Settings page opens and saves configuration
- [ ] Connection test works with valid credentials
- [ ] Notes can be created for webpages
- [ ] Existing notes are loaded correctly
- [ ] Notes can be updated
- [ ] Error messages are clear and helpful
- [ ] UI is responsive and looks good

### Testing with Obsidian

1. Install Obsidian and the Local REST API plugin
2. Configure the extension with your API key
3. Test on various websites
4. Verify notes are created in your vault
5. Check that note updates work correctly

## Guidelines

### Features

- Keep features focused on the core use case: taking notes about webpages
- Consider performance impact
- Ensure compatibility with Manifest V3
- Test with the latest version of Chrome

### Code Quality

- Validate JavaScript with `node --check <file>`
- Check for console errors
- Handle errors gracefully
- Provide meaningful error messages to users

### Documentation

- Update README.md if adding new features
- Add inline comments for complex logic
- Update QUICKSTART.md if changing setup process

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### PR Description Should Include

- What changes you made
- Why you made them
- How to test the changes
- Screenshots if UI changed

## Reporting Bugs

When reporting bugs, please include:

- Chrome version
- Extension version
- Obsidian version
- Local REST API plugin version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Any console errors

## Feature Requests

We welcome feature requests! Please:

- Check if the feature has already been requested
- Describe the use case clearly
- Explain how it would benefit users
- Consider if it fits the extension's scope

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
