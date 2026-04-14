# Skills-Sync

[![npm version](https://badge.fury.io/js/skills-sync.svg)](https://badge.fury.io/js/skills-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Cross Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-green.svg)](https://github.com/shanliuling/skills-sync)

English | [中文](./README.zh.md)

A CLI tool to sync local `skills` folders across multiple AI apps.

## Install

```bash
npm i -g skills-sync
```

## Quick Start

```bash
skills-sync
```

First run guides you through setup automatically.

## Features

- 🔍 Auto-detect skills paths for **9 AI apps** (Claude, Gemini, Codex, Cursor, Windsurf, Copilot, Cline, Continue, Roo Code)
- 🔗 Create symbolic links without admin rights (Windows Junction/macOS/Linux symlink)
- 📦 One-click import of existing local skills
- 🔄 Optional Git sync to GitHub
- 🌐 Chinese and English interfaces
- 🖥️ Cross-platform support: Windows, macOS, Linux
- ⚡ Real-time sync - all apps share the same skills directory
- 💾 Space efficient - single copy for all apps

## Supported AI Apps

- Claude
- Gemini CLI
- Codex
- Cursor
- Windsurf
- GitHub Copilot
- Cline
- Continue
- Roo Code

## Commands

| Command        | Description                      |
| -------------- | -------------------------------- |
| `skills-sync`  | Interactive startup              |
| `setup`        | Initialize config                |
| `init`         | One-click: setup + import + link |
| `import`       | Import local skills              |
| `link`         | Create/repair links              |
| `health`       | Check link status                |
| `sync`         | Sync to GitHub                   |
| `clone <repo>` | Clone skills repo from GitHub    |
| `app`          | Manage app configs               |

## Path Detection

Automatically adapts to non-C drives and custom locations:

```
Detected app paths:

  Master: C:\Users\You\AISkills

  Apps:
    ✓ Claude     C:\Users\You\AppData\Roaming\Claude\skills
    ○ Gemini     C:\Users\You\.gemini\skills

Are these paths correct? (Yes, continue / Edit paths)
```

## Language

```bash
# CLI parameter
skills-sync --lang zh

# Environment variable
export SKILLS_SYNC_LANG=zh

# Or set in config.yaml
language: zh
```

## Config Example

```yaml
language: en
masterDir: C:/Users/You/AISkills

git:
  enabled: true
  remote: https://github.com/you/skills.git

apps:
  - name: Claude
    skillsPath: C:/Users/You/AppData/Roaming/Claude/skills
    enabled: true
```

## Requirements

- **Windows**, **macOS**, or **Linux**
- Node.js 18+

### Platform-specific Notes

**Windows:**
- Uses Junction links (no admin rights required)
- Supports custom installation locations (non-C drives)

**macOS:**
- Uses native symbolic links
- No sudo required for user directories

**Linux:**
- Uses native symbolic links
- Supports XDG_CONFIG_HOME and XDG_DATA_HOME

## License

MIT
