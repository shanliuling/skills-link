<div align="center">

# Skills-Link

**一个 skills 文件夹，所有 AI 应用共享。**

一条命令，在 41+ AI 编程工具之间同步本地 skills。

[![npm version](https://badge.fury.io/js/skills-link.svg)](https://badge.fury.io/js/skills-link)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](./README.md) | 中文

</div>

---

## 工作原理

```
  Claude Code ──┐
  Cursor ───────┤
  Windsurf ─────┤
  Cline ────────┼──▶  ~/AISkills/  ◀──▶  GitHub
  Gemini CLI ───┤        ▲
  Trae ─────────┤        │
  Roo Code ─────┘   Master 目录
                    (唯一数据源)
```

每个应用的 `~/.xxx/skills` 变成指向同一个 Master 目录的符号链接。新增或编辑一个 skill，所有应用立即可见。

---

## 安装

```bash
npm i -g skills-link
```

## 快速开始

```bash
skills-link
```

就这样。首次运行自动引导 — 检测应用、导入 skills、创建链接。

随时再运行一次即可同步变更和检查状态。

---

## 命令

| 命令 | 说明 |
|---|---|
| `skills-link` | 交互式启动 — 导入、链接、同步 |
| `skills-link list` | 列出本地 skills（自动去重） |
| `skills-link remove` | 从 Master 目录删除 skills |
| `skills-link app` | 切换启用的应用 |
| `skills-link sync` | 提交并推送到 GitHub |
| `skills-link watch` | 文件变更时自动同步 |
| `skills-link health` | 检查符号链接状态 |
| `skills-link reset` | 撤销所有操作，恢复初始状态 |

---

## 支持的 Agent

开箱即用 41+ agent：

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

另有 `universal` 通用回退，适用于未列出的 agent。[一行代码即可添加新 agent。](src/core/path-detect.ts)

---

## 跨设备同步

```bash
# 机器 A — 推送 skills 到 GitHub
skills-link sync

# 机器 B — 克隆并链接
skills-link  # 自动从远程拉取
```

---

## 配置

`~/.skills-link/config.yaml`：

```yaml
language: zh
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

## 语言设置

```bash
skills-link --lang en     # 命令行参数
export SKILLS_LINK_LANG=en  # 环境变量
# 或在 config.yaml 中设置 language: en
```

---

## 系统要求

- Node.js 18+
- Windows / macOS / Linux

**Windows** 使用 Junction 链接 — 无需管理员权限。
**macOS / Linux** 使用原生符号链接。

---

## License

[MIT](./LICENSE)
