# Skills-Link

[![npm version](https://badge.fury.io/js/skills-link.svg)](https://badge.fury.io/js/skills-link)
[![Build Status](https://github.com/shanliuling/skills-link/workflows/CI/badge.svg)](https://github.com/shanliuling/skills-link/actions)

[English](./README.md) | 中文

在多个 AI 应用之间同步本地 `skills` 文件夹的 CLI 工具。

## 安装

```bash
npm i -g skills-link
```

## 快速开始

```bash
skills-link
```

首次运行自动引导配置。

## 功能

- 🔍 声明式 agent 注册表，支持 **41+ AI agent**（一行代码即可添加新 agent）
- 🔗 创建符号链接，无需管理员权限（Windows Junction/macOS/Linux symlink）
- 📦 一键导入本地已有 skills
- 🔄 可选 Git 同步到 GitHub
- 🌐 支持中英文界面
- 🖥️ 跨平台支持：Windows、macOS、Linux
- ⚡ 实时同步 - 所有应用共享同一个 skills 目录
- 💾 节省空间 - 所有应用共用一份 skills

## 支持的 AI Agent

开箱即用支持 41+ agent：

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

另有 `universal` 通用回退，适用于未列出的 agent。

## 命令

| 命令            | 说明                              |
| --------------- | --------------------------------- |
| `skills-link`   | 交互式启动                        |
| `setup`         | 初始化配置                        |
| `init`          | 一键初始化：setup + import + link |
| `import`        | 导入本地 skills                   |
| `link`          | 创建/修复链接                     |
| `health`        | 检查链接状态                      |
| `sync`          | 同步到 GitHub                     |
| `clone <repo>`  | 从 GitHub 克隆 skills 仓库        |
| `app`           | 管理应用配置                      |

## 路径约定

所有 agent 遵循 `~/.xxx/skills` 约定（项目级：`.xxx/skills`）：

```
检测到以下路径：

  Master: ~/AISkills

  Agent：
    ✓ Claude Code  ~/.claude/skills
    ✓ Cursor       ~/.cursor/skills
    ○ Gemini CLI   ~/.gemini/skills
    ... +38 more

路径正确吗？(是，继续 / 编辑路径)
```

## 语言设置

```bash
# 命令行参数
skills-link --lang zh

# 环境变量
export SKILLS_LINK_LANG=zh

# 或在 config.yaml 中设置
language: zh
```

## 配置示例

```yaml
language: zh
masterDir: C:/Users/You/AISkills

git:
  enabled: true
  remote: https://github.com/you/skills.git

apps:
  - name: Claude Code
    skillsPath: ~/.claude/skills
    enabled: true
```

## 系统要求

- **Windows**、**macOS** 或 **Linux**
- Node.js 18+

### 平台特定说明

**Windows:**
- 使用 Junction 链接（无需管理员权限）
- 支持自定义安装位置（非 C 盘）

**macOS:**
- 使用原生符号链接
- 用户目录下无需 sudo

**Linux:**
- 使用原生符号链接
- 支持 XDG_CONFIG_HOME 和 XDG_DATA_HOME

## License

MIT
