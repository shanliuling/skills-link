<div align="center">

# Skills-Link

<img src="assets/header-image.jpg" alt="Skills-Link Banner" width="800" />

**一个 skills 文件夹，所有 AI 应用共享。**

一条命令，在 41+ AI 编程工具之间同步本地 skills。

也支持 rules 同步：`rules-link`

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
|------|------|
| `skills-link` | 主命令 — 同步 skills 到所有应用 |
| `skills-link add <repo>` | 从 GitHub 安装 skill |
| `skills-link list` | 列出本地 skills |
| `skills-link sync` | 推送变更到 GitHub |
| `skills-link app` | 管理启用的应用 |
| `rules-link` | 同步 rules |

### 从 GitHub 安装 skill

```bash
# 从仓库安装（选择其中一个）
skills-link add vercel-labs/agent-skills

# 安装指定的 skill
skills-link add vercel-labs/agent-skills -s web-design-guidelines
```

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

还支持 `universal` 作为任何未列出 agent 的备选方案。[只需一行代码即可添加新 agent。](src/core/path-detect.ts)

---

## 跨设备同步

```bash
# 电脑 A — 推送 skills 到 GitHub
skills-link sync

# 电脑 B — 克隆并链接
skills-link  # 自动从远程拉取
```

---

## 配置

`~/AISkills/config.yaml`：

```yaml
masterDir: ~/AISkills

git:
  enabled: true
  remote: https://github.com/you/skills.git
  autoPush: true

apps:
  - name: Claude Code
    skillsPath: ~/.claude/skills
    enabled: true
```

---

## 语言

```bash
skills-link --lang zh     # 命令行参数
# 或在 config.yaml 中设置 language: zh
```

---

## 系统要求

- Node.js 18+
- Windows / macOS / Linux

**Windows** 使用 Junction 链接 — 无需管理员权限。
**macOS / Linux** 使用原生符号链接。

---

## 许可证

[MIT](./LICENSE)