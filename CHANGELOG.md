# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-04-14

### 🎉 Major Release

This is a major release with significant improvements and new features.

### Added

#### TypeScript Support
- ✅ Migrated entire codebase to TypeScript
- ✅ Added strict type checking
- ✅ Better IDE support and code completion
- ✅ Improved code quality and maintainability

#### Testing Framework
- ✅ Added Vitest testing framework
- ✅ Unit tests for core modules (logger, symlink, path-detect)
- ✅ Test coverage reporting

#### Extended AI Agent Support
- ✅ Claude
- ✅ Gemini CLI
- ✅ Codex
- ✅ **Cursor** (new)
- ✅ **Windsurf** (new)
- ✅ **GitHub Copilot** (new)
- ✅ **Cline** (new)
- ✅ **Continue** (new)
- ✅ **Roo Code** (new)

**Total: 10+ AI agents supported**

#### Project Quality
- ✅ GitHub badges (npm version, license, TypeScript, platform)
- ✅ Updated documentation with supported apps
- ✅ Fixed package name consistency (skills-link → skills-sync)

### Changed

#### Breaking Changes
- ⚠️ Package renamed from `skills-link` to `skills-sync`
- ⚠️ CLI command remains `skills-sync` (consistent with package name)

#### Improvements
- ✅ Better type safety with TypeScript
- ✅ Improved cross-platform compatibility
- ✅ Enhanced error handling with detailed messages
- ✅ Better code organization and structure

### Technical Details

#### Dependencies
- Added: typescript@^6.0.2
- Added: @types/node@^25.6.0
- Added: ts-node@^10.9.2
- Added: vitest@^4.1.4
- Added: @vitest/ui@^4.1.4

#### Build Process
- New build script: `npm run build` (compiles TypeScript)
- New test script: `npm test` (runs Vitest)
- New dev scripts: `npm run build:watch`, `npm run test:watch`

---

## [0.2.0] - 2026-04-14

### Added

#### Cross-Platform Support
- ✅ macOS support with native symlinks
- ✅ Linux support with native symlinks
- ✅ Platform-specific path detection

#### Features
- ✅ Platform-specific default paths
- ✅ XDG_CONFIG_HOME and XDG_DATA_HOME support (Linux)
- ✅ Detailed error handling and user hints
- ✅ Platform detection and adaptation

### Changed

- ✅ Refactored `symlink.js` for cross-platform compatibility
- ✅ Updated `path-detect.js` with platform-specific candidates
- ✅ Updated `config.js` for cross-platform defaults
- ✅ Enhanced documentation with platform-specific notes

---

## [0.1.0] - 2026-04-12

### Added

- ✅ Initial release
- ✅ Windows Junction support (no admin rights required)
- ✅ Auto path detection for Claude, Gemini CLI, Codex
- ✅ One-click init command
- ✅ Git sync functionality
- ✅ Chinese and English interfaces
- ✅ Watch mode for auto-sync
- ✅ Health check command
- ✅ Import existing skills
- ✅ Clone from GitHub repository

### Features

- 🔍 Smart path detection
- 🔗 Junction links without admin rights
- 📦 One-click setup experience
- 🔄 Git-based synchronization
- 🌐 Multi-language support

---

## Release Notes

### Version 1.0.0 Highlights

This release represents a major milestone with TypeScript migration and extended agent support. Key highlights:

**For Users:**
- Support for 10+ popular AI coding assistants
- Better cross-platform experience
- More reliable with TypeScript and tests

**For Contributors:**
- TypeScript codebase for better maintainability
- Comprehensive test suite
- Clear contribution guidelines

**For Everyone:**
- Professional-grade code quality
- Future-proof architecture
- Ready for production use

### Migration Guide

If you're upgrading from v0.x:

1. **Package name changed**: Update your install command
   ```bash
   npm uninstall -g skills-link
   npm install -g skills-sync
   ```

2. **No config changes needed**: Your existing config.yaml will work

3. **New agents supported**: Run `skills-sync setup` to detect new AI apps

### Future Roadmap

- [ ] Add more AI agents (Augment, Goose, etc.)
- [ ] Skill marketplace and sharing
- [ ] Web UI for skill management
- [ ] Plugin system for custom agents
- [ ] Enhanced conflict resolution
