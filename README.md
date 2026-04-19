<div align="center">

# Skills-Link

**One skills folder, every AI app.**

Sync your local `skills` across 41+ AI coding agents with a single command.

[![npm version](https://badge.fury.io/js/skills-link.svg)](https://badge.fury.io/js/skills-link)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

English | [中文](./README.zh.md)

</div>

---

## How it works

```
  Claude Code ──┐
  Cursor ───────┤
  Windsurf ─────┤
  Cline ────────┼──▶  ~/AISkills/  ◀──▶  GitHub
  Gemini CLI ───┤        ▲
  Trae ─────────┤        │
  Roo Code ─────┘   Master Directory
                    (single source of truth)
```

Every app's `~/.xxx/skills` becomes a symlink pointing to one master directory. Add or edit a skill once — every app sees it instantly.

---

## Install

```bash
npm i -g skills-link
```

## Quick start

```bash
skills-link
```

That's it. First run walks you through everything — detect apps, import skills, create links.

Run it again anytime to sync changes and check health.

---

## Commands

| Command | Description |
|---|---|
| `skills-link` | Interactive startup — import, link, sync |
| `skills-link list` | List local skills (deduplicated) |
| `skills-link remove` | Remove skills from master directory |
| `skills-link app` | Toggle which apps are enabled |
| `skills-link sync` | Commit & push to GitHub |
| `skills-link watch` | Auto-sync on file changes |
| `skills-link health` | Check symlink status |
| `skills-link reset` | Undo everything, restore initial state |

---

## Supported agents

41+ agents out of the box:

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

Plus a `universal` fallback for any agent not listed. [Add new agents with one line of code.](src/core/path-detect.ts)

---

## Cross-device sync

```bash
# Machine A — push skills to GitHub
skills-link sync

# Machine B — clone and link
skills-link  # automatically pulls from remote
```

---

## Config

`~/.skills-link/config.yaml`:

```yaml
language: en
masterDir: ~/AISkills

git:
  enabled: true
  remote: https://github.com/you/skills.git
  autoPush: true

watch:
  enabled: false
  debounceMs: 3000

apps:
  - name: Claude Code
    skillsPath: ~/.claude/skills
    enabled: true
  - name: Cursor
    skillsPath: ~/.cursor/skills
    enabled: true
```

---

## Language

```bash
skills-link --lang zh     # CLI flag
export SKILLS_LINK_LANG=zh  # env var
# or set language: zh in config.yaml
```

---

## Requirements

- Node.js 18+
- Windows / macOS / Linux

**Windows** uses Junction links — no admin rights needed.
**macOS / Linux** uses native symlinks.

---

## License

[MIT](./LICENSE)
