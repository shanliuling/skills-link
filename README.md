# Skills-Link

English | [中文](./README.zh.md)

A CLI tool to sync local `skills` folders across multiple AI apps.

## Install

```bash
npm i -g skills-link
```

## Quick Start

```bash
skills-link
```

First run guides you through setup automatically.

## Features

- 🔍 Auto-detect skills paths for Claude, Gemini, Codex, etc.
- 🔗 Create symbolic links without admin rights (Windows Junction/macOS/Linux symlink)
- 📦 One-click import of existing local skills
- 🔄 Optional Git sync to GitHub
- 🌐 Chinese and English interfaces
- 🖥️ Cross-platform support: Windows, macOS, Linux

## Commands

| Command       | Description                      |
| ------------- | -------------------------------- |
| `skills-link` | Interactive startup              |
| `setup`       | Initialize config                |
| `init`        | One-click: setup + import + link |
| `import`      | Import local skills              |
| `link`        | Create/repair links              |
| `health`      | Check link status                |
| `sync`        | Sync to GitHub                   |
| `app`         | Manage app configs               |

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
