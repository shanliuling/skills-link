# Skills-Link

[![npm version](https://badge.fury.io/js/skills-link.svg)](https://badge.fury.io/js/skills-link)
[![Build Status](https://github.com/shanliuling/skills-link/workflows/CI/badge.svg)](https://github.com/shanliuling/skills-link/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Cross Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-green.svg)](https://github.com/shanliuling/skills-link)

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

- 🔍 Declarative agent registry supporting **41+ AI agents** (add new agents with one line)
- 🔗 Create symbolic links without admin rights (Windows Junction/macOS/Linux symlink)
- 📦 One-click import of existing local skills
- 🔄 Optional Git sync to GitHub
- 🌐 Chinese and English interfaces
- 🖥️ Cross-platform support: Windows, macOS, Linux
- ⚡ Real-time sync - all apps share the same skills directory
- 💾 Space efficient - single copy for all apps

## Supported AI Agents

41+ agents supported out of the box:

| | | | |
|---|---|---|---|
| AdaL | Amp | Antigravity | Augment |
| Claude Code | Cline | CodeBuddy | Codex |
| Command Code | Continue | Cortex Code | Crush |
| Cursor | Droid | Gemini CLI | GitHub Copilot |
| Goose | iFlow CLI | Junie | Kilo Code |
| Kimi Code CLI | Kiro CLI | Kode | MCPJam |
| Mistral Vibe | Mux | Neovate | OpenClaw |
| OpenCode | OpenHands | Pi | Pochi |
| Qoder | Qwen Code | Replit | Roo Code |
| Trae | Trae CN | Windsurf | Zencoder |

Plus a `universal` fallback for any agent not listed.

## Commands

| Command        | Description                      |
| -------------- | -------------------------------- |
| `skills-link`  | Interactive startup              |
| `setup`        | Initialize config                |
| `init`         | One-click: setup + import + link |
| `import`       | Import local skills              |
| `link`         | Create/repair links              |
| `health`       | Check link status                |
| `sync`         | Sync to GitHub                   |
| `clone <repo>` | Clone skills repo from GitHub    |
| `app`          | Manage app configs               |

## Path Convention

All agents follow the `~/.xxx/skills` convention (project-level: `.xxx/skills`):

```
Detected agent paths:

  Master: ~/AISkills

  Agents:
    ✓ Claude Code  ~/.claude/skills
    ✓ Cursor       ~/.cursor/skills
    ○ Gemini CLI   ~/.gemini/skills
    ... +38 more

Are these paths correct? (Yes, continue / Edit paths)
```

## Language

```bash
# CLI parameter
skills-link --lang zh

# Environment variable
export SKILLS_LINK_LANG=zh

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
  - name: Claude Code
    skillsPath: ~/.claude/skills
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
