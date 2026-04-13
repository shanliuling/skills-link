# Skills-Sync

`skills-sync` is a Windows-first CLI for syncing local `skills` folders across multiple AI apps.

## What it does

- Scans local AI app skill directories
- Imports skills into a shared master folder
- Creates Windows Junction links for supported apps
- Optionally syncs the master folder to GitHub
- Checks link health and repairs broken targets
- **Supports both Chinese and English interfaces**

## Install

```bash
npm i -g skills-sync
```

## Quick Start

```bash
skills-sync
```

On first run, the CLI will guide you through setup.

## Internationalization (i18n)

Skills-Sync supports both **Chinese (中文)** and **English** interfaces.

### Language Selection Priority

The language is determined in the following order (highest to lowest priority):

1. **CLI parameter**: `--lang <zh|en>`
2. **Config file**: `language` field in `config.yaml`
3. **Environment variable**: `SKILLS_SYNC_LANG`
4. **System locale**: Auto-detected from your system
5. **Default fallback**: English (`en`)

### Using `--lang` Parameter

```bash
# Use Chinese interface
skills-sync --lang zh

# Use English interface
skills-sync --lang en

# Works with all commands
skills-sync setup --lang zh
skills-sync import --lang en
skills-sync health --lang zh
```

### Using Environment Variable

```bash
# Windows (PowerShell)
$env:SKILLS_SYNC_LANG = "zh"
skills-sync

# Windows (CMD)
set SKILLS_SYNC_LANG=zh
skills-sync

# Linux/macOS
export SKILLS_SYNC_LANG=zh
skills-sync
```

### Using Config File

Add `language` to your `config.yaml`:

```yaml
language: zh
masterDir: C:/Users/USERNAME/AISkills
# ... rest of config
```

### First-Time Setup

When you run `skills-sync` or `skills-sync setup` for the first time, you'll be prompted to select your preferred language. This choice is saved to `config.yaml` for future sessions.

## Commands

| Command                    | Description                                |
| -------------------------- | ------------------------------------------ |
| `skills-sync`              | Interactive startup flow                   |
| `skills-sync setup`        | Create `config.yaml` and master folder     |
| `skills-sync init`         | Run setup, import, and link in one step    |
| `skills-sync import`       | Scan and import local skills into master   |
| `skills-sync link`         | Create or repair Junction links            |
| `skills-sync health`       | Check link status and Git state            |
| `skills-sync sync`         | Commit and push changes to GitHub          |
| `skills-sync watch`        | Watch the master folder and sync on change |
| `skills-sync rollback`     | Roll back to a previous commit             |
| `skills-sync clone [repo]` | Clone a remote skills repo                 |
| `skills-sync app`          | Manage configured apps                     |
| `skills-sync list`         | List discovered local skills               |

## Supported Apps

The default config includes common Windows paths for:

- Claude Code
- Antigravity
- Gemini CLI
- Codex

You can edit `config.yaml` later to add or disable apps.

## GitHub Workflow

If you want to keep the master skills folder in GitHub:

1. Create an empty repository on GitHub.
2. Run `skills-sync setup` and provide the repo URL when prompted.
3. Use `skills-sync sync` to push later updates.

## Local Config

The app writes `config.yaml` in the project root. That file is intentionally ignored from version control because it contains your personal paths.

Example:

```yaml
language: en
masterDir: C:/Users/USERNAME/AISkills

git:
  enabled: true
  remote: https://github.com/your-name/skills-sync.git
  autoPush: true

apps:
  - name: Claude Code
    skillsPath: C:/Users/USERNAME/.claude/skills
    enabled: true
```

## Troubleshooting

### Language not changing?

1. **Check priority order**: CLI `--lang` > config `language` > env `SKILLS_SYNC_LANG` > system locale
2. **Verify config file**: Ensure `language: zh` or `language: en` is set in `config.yaml`
3. **Check environment variable**: Make sure `SKILLS_SYNC_LANG` is set correctly
4. **Use explicit parameter**: Try `skills-sync --lang zh` to force a specific language

### Old config file compatibility

Older `config.yaml` files without the `language` field will continue to work. The CLI will use the default language detection (system locale → English fallback).

## Platform Notes

- Windows is the primary target.
- Junction links are used so admin rights are usually not required.
- Node.js 18+ is required.

## Publishing Notes

This repo is ready to be published as a standalone GitHub project and, if you want, as an npm package later.

## License

MIT
