# Skills-Link

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

- 🔍 自动探测 Claude、Gemini、Codex 等 AI 应用的 skills 路径
- 🔗 创建 Windows Junction 链接，无需管理员权限
- 📦 一键导入本地已有 skills
- 🔄 可选 Git 同步到 GitHub
- 🌐 支持中英文界面

## 命令

| 命令          | 说明                              |
| ------------- | --------------------------------- |
| `skills-link` | 交互式启动                        |
| `setup`       | 初始化配置                        |
| `init`        | 一键初始化：setup + import + link |
| `import`      | 导入本地 skills                   |
| `link`        | 创建/修复链接                     |
| `health`      | 检查链接状态                      |
| `sync`        | 同步到 GitHub                     |
| `app`         | 管理应用配置                      |

## 路径探测

自动适配非 C 盘和自定义安装位置：

```
检测到以下路径：

  Master: C:\Users\You\AISkills

  应用：
    ✓ Claude     C:\Users\You\AppData\Roaming\Claude\skills
    ○ Gemini     C:\Users\You\.gemini\skills

路径正确吗？(是，继续 / 编辑路径)
```

## 语言设置

```bash
# 命令行参数
skills-link --lang zh

# 环境变量
export SKILLS_SYNC_LANG=zh

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
  - name: Claude
    skillsPath: C:/Users/You/AppData/Roaming/Claude/skills
    enabled: true
```

## 要求

- Windows（主要平台）
- Node.js 18+

## License

MIT
