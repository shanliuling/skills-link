# Contributing to Skills-Sync

感谢你考虑为 Skills-Sync 做贡献！🎉

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [提交代码](#提交代码)
- [报告 Bug](#报告-bug)
- [功能建议](#功能建议)

## 行为准则

本项目采用贡献者公约作为行为准则。参与此项目即表示你同意遵守其条款。请阅读 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 了解详情。

## 如何贡献

### 报告 Bug

如果你发现了 bug，请先搜索 [Issues](https://github.com/shanliuling/skills-sync/issues) 确保没有重复报告。

如果没有，请创建新的 Issue 并包含：
- 清晰的标题和描述
- 重现步骤
- 期望行为
- 实际行为
- 你的环境（OS、Node 版本等）
- 相关的日志输出

### 功能建议

欢迎提出新功能建议！请在 Issue 中详细描述：
- 功能描述
- 使用场景
- 可能的实现方案

### 提交代码

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 开发环境设置

### 前置要求

- Node.js 18+
- npm 或 yarn
- Git

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/shanliuling/skills-sync.git
cd skills-sync

# 安装依赖
npm install

# 构建 TypeScript
npm run build

# 运行测试
npm test

# 开发模式（监听文件变化）
npm run build:watch
```

### 项目结构

```
skills-sync/
├── bin/              # CLI 入口
├── src/
│   ├── commands/     # 命令实现
│   ├── core/         # 核心功能模块
│   ├── locales/      # 国际化文件
│   └── types/        # TypeScript 类型定义
├── dist/             # 编译输出
└── tests/            # 测试文件
```

### 编码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 为新功能添加测试
- 更新相关文档
- 保持提交信息清晰

### 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 带 UI 的测试
npm run test:ui

# 生成覆盖率报告
npm run test:coverage
```

## Pull Request 指南

1. 确保 PR 标题清晰描述变更
2. 在 PR 描述中引用相关 Issue
3. 确保所有测试通过
4. 如果添加新功能，请添加测试
5. 更新相关文档

### PR 检查清单

- [ ] 代码遵循项目编码规范
- [ ] 已进行自我代码审查
- [ ] 代码有适当的注释
- [ ] 文档已更新
- [ ] 没有引入新的警告
- [ ] 测试已通过
- [ ] 依赖项更新已添加到 package.json

## 发布流程

项目维护者会负责发布新版本。发布步骤：

1. 更新 CHANGELOG.md
2. 更新 package.json 版本号
3. 创建 git tag
4. 推送到 npm

## 获取帮助

如果你有任何问题，可以：
- 在 [Issues](https://github.com/shanliuling/skills-sync/issues) 提问
- 查看 [Wiki](https://github.com/shanliuling/skills-sync/wiki)（如有）

## 许可证

通过贡献代码，你同意你的代码将以 MIT 许可证授权。

---

再次感谢你的贡献！❤️
