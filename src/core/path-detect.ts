/**
 * path-detect.ts - 跨平台路径智能探测模块
 *
 * 核心思路：声明式注册表 + 通用路径解析器
 * - agentRegistry: 每个 agent 只需一行声明，自动推导项目级/全局级路径
 * - resolveGlobalPath: 通用跨平台路径解析（替换掉原来每个 agent 一套 if/else）
 * - 保留 detectAppPath / detectAllAppPaths 做运行时探测
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * Agent 路径定义
 * - projectPath: 项目内的 skills 目录（相对路径，如 .cursor/skills）
 * - globalPath: 全局 skills 目录模板，支持 ~ / $XDG_CONFIG_HOME / $CLAUDE_CONFIG_DIR
 */
export interface AgentPathDef {
  displayName: string
  projectPath: string
  globalPath: string
}

/**
 * 检测到的应用路径信息
 */
export interface DetectedAppPath {
  name: string
  skillsPath: string | null
  exists: boolean
  enabled?: boolean
}

// ─── 声明式注册表：加一个 agent 只需加一行 ───

export const agentRegistry: Record<string, AgentPathDef> = {
  // A
  adal:         { displayName: 'AdaL',          projectPath: '.adal/skills',    globalPath: '~/.adal/skills' },
  amp:          { displayName: 'Amp',           projectPath: '.amp/skills',     globalPath: '~/.amp/skills' },
  antigravity:  { displayName: 'Antigravity',   projectPath: '.agent/skills',   globalPath: '~/.gemini/antigravity/skills' },
  augment:      { displayName: 'Augment',       projectPath: '.augment/skills', globalPath: '~/.augment/skills' },

  // C
  claude:       { displayName: 'Claude Code',   projectPath: '.claude/skills',  globalPath: '$CLAUDE_CONFIG_DIR/skills' },
  cline:        { displayName: 'Cline',         projectPath: '.cline/skills',   globalPath: '~/.cline/skills' },
  codebuddy:    { displayName: 'CodeBuddy',     projectPath: '.codebuddy/skills', globalPath: '~/.codebuddy/skills' },
  codex:        { displayName: 'Codex',         projectPath: '.codex/skills',   globalPath: '~/.codex/skills' },
  'command-code': { displayName: 'Command Code', projectPath: '.commandcode/skills', globalPath: '~/.commandcode/skills' },
  continue:     { displayName: 'Continue',      projectPath: '.continue/skills', globalPath: '~/.continue/skills' },
  cortex:       { displayName: 'Cortex Code',   projectPath: '.cortex/skills',  globalPath: '~/.snowflake/cortex/skills' },
  crush:        { displayName: 'Crush',         projectPath: '.crush/skills',   globalPath: '$XDG_CONFIG_HOME/crush/skills' },
  cursor:       { displayName: 'Cursor',        projectPath: '.cursor/skills',  globalPath: '~/.cursor/skills' },

  // D
  droid:        { displayName: 'Droid',         projectPath: '.factory/skills', globalPath: '~/.factory/skills' },

  // G
  'gemini-cli': { displayName: 'Gemini CLI',    projectPath: '.agent/skills',   globalPath: '~/.gemini/skills' },
  'github-copilot': { displayName: 'GitHub Copilot', projectPath: '.github/skills', globalPath: '~/.copilot/skills' },
  goose:        { displayName: 'Goose',         projectPath: '.goose/skills',   globalPath: '$XDG_CONFIG_HOME/goose/skills' },

  // I-K
  'iflow-cli':  { displayName: 'iFlow CLI',     projectPath: '.iflow/skills',   globalPath: '~/.iflow/skills' },
  junie:        { displayName: 'Junie',         projectPath: '.junie/skills',   globalPath: '~/.junie/skills' },
  kilo:         { displayName: 'Kilo Code',     projectPath: '.kilocode/skills', globalPath: '~/.kilocode/skills' },
  'kimi-cli':   { displayName: 'Kimi Code CLI', projectPath: '.kimi/skills',    globalPath: '$XDG_CONFIG_HOME/kimi/skills' },
  'kiro-cli':   { displayName: 'Kiro CLI',      projectPath: '.kiro/skills',    globalPath: '~/.kiro/skills' },
  kode:         { displayName: 'Kode',          projectPath: '.kode/skills',    globalPath: '~/.kode/skills' },

  // M-O
  mcpjam:       { displayName: 'MCPJam',        projectPath: '.mcpjam/skills',  globalPath: '~/.mcpjam/skills' },
  'mistral-vibe': { displayName: 'Mistral Vibe', projectPath: '.vibe/skills',   globalPath: '~/.vibe/skills' },
  mux:          { displayName: 'Mux',           projectPath: '.mux/skills',     globalPath: '~/.mux/skills' },
  neovate:      { displayName: 'Neovate',       projectPath: '.neovate/skills', globalPath: '~/.neovate/skills' },
  openclaw:     { displayName: 'OpenClaw',      projectPath: '.openclaw/skills', globalPath: '~/.openclaw/skills' },
  opencode:     { displayName: 'OpenCode',      projectPath: '.opencode/skills', globalPath: '~/.opencode/skills' },
  openhands:    { displayName: 'OpenHands',     projectPath: '.openhands/skills', globalPath: '~/.openhands/skills' },

  // P-R
  pi:           { displayName: 'Pi',            projectPath: '.pi/skills',      globalPath: '~/.pi/agent/skills' },
  pochi:        { displayName: 'Pochi',         projectPath: '.pochi/skills',   globalPath: '~/.pochi/skills' },
  qoder:        { displayName: 'Qoder',         projectPath: '.qoder/skills',   globalPath: '~/.qoder/skills' },
  'qwen-code':  { displayName: 'Qwen Code',     projectPath: '.qwen/skills',    globalPath: '~/.qwen/skills' },
  replit:       { displayName: 'Replit',        projectPath: '.replit/skills',  globalPath: '$XDG_CONFIG_HOME/replit/skills' },
  roo:          { displayName: 'Roo Code',      projectPath: '.roo/skills',     globalPath: '~/.roo/skills' },

  // T-Z
  trae:         { displayName: 'Trae',          projectPath: '.trae/skills',    globalPath: '~/.trae/skills' },
  'trae-cn':    { displayName: 'Trae CN',       projectPath: '.trae/skills',    globalPath: '~/.trae-cn/skills' },
  windsurf:     { displayName: 'Windsurf',      projectPath: '.windsurf/skills', globalPath: '~/.codeium/windsurf/skills' },
  zencoder:     { displayName: 'Zencoder',      projectPath: '.zencoder/skills', globalPath: '~/.zencoder/skills' },

  // Universal fallback
  universal:    { displayName: 'Universal',     projectPath: '.agents/skills',  globalPath: '~/.agents/skills' },
}

// ─── 通用路径解析器（替代原来每个 agent 一套 if/else） ───

/**
 * 将模板路径解析为当前平台的真实绝对路径
 *
 * 支持的模板变量：
 *   ~                   → 用户主目录
 *   $XDG_CONFIG_HOME    → XDG 配置目录（默认 ~/.config）
 *   $CLAUDE_CONFIG_DIR  → Claude 配置目录（默认 ~/.claude）
 *   $APPDATA            → Windows AppData/Roaming
 *   $LOCALAPPDATA       → Windows AppData/Local
 */
export function resolveGlobalPath(template: string): string {
  const home = os.homedir()
  let resolved = template

  // 按最长匹配优先替换环境变量
  const envVars: Array<{ pattern: RegExp; value: () => string }> = [
    { pattern: /^\$CLAUDE_CONFIG_DIR/,  value: () => process.env.CLAUDE_CONFIG_DIR ?? path.join(home, '.claude') },
    { pattern: /^\$XDG_CONFIG_HOME/,    value: () => process.env.XDG_CONFIG_HOME ?? path.join(home, '.config') },
    { pattern: /^\$APPDATA/,            value: () => process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming') },
    { pattern: /^\$LOCALAPPDATA/,        value: () => process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local') },
  ]

  for (const { pattern, value } of envVars) {
    if (pattern.test(resolved)) {
      resolved = resolved.replace(pattern, value())
      break
    }
  }

  // ~ 替换
  if (resolved.startsWith('~')) {
    resolved = resolved.replace(/^~/, home)
  }

  // 规范化路径分隔符（Windows 上统一为 \）
  return path.normalize(resolved)
}

// ─── 运行时探测（保留你原有的能力，但用注册表驱动） ───

/**
 * 检测指定 agent 的全局 skills 路径
 * 优先用 winGlobalPath（Windows），否则用 resolveGlobalPath 解析 globalPath
 */
export function detectAppPath(agentId: string): string | null {
  const def = agentRegistry[agentId]
  if (!def) return null

  // Windows 优先用专用路径
  const resolved = resolveGlobalPath(def.globalPath)

  // 如果路径已存在，直接返回
  if (fs.existsSync(resolved)) return resolved

  // 回退：尝试 projectPath 模式的全局等价路径
  // 比如 .cursor/skills → ~/.cursor/skills
  const fallback = path.join(os.homedir(), def.projectPath)
  if (fs.existsSync(fallback)) return fallback

  // 都不存在，返回模板解析结果（让用户知道该放哪）
  return resolved
}

/**
 * 检测所有 agent 的路径
 */
export function detectAllAppPaths(): DetectedAppPath[] {
  const results: DetectedAppPath[] = []

  for (const [id, def] of Object.entries(agentRegistry)) {
    const detectedPath = detectAppPath(id)
    const exists = detectedPath ? fs.existsSync(detectedPath) : false

    results.push({
      name: def.displayName,
      skillsPath: detectedPath,
      exists,
    })
  }

  return results
}

/**
 * 检测主目录
 */
export function detectMasterDir(): string {
  const homeDir = os.homedir()
  const platform = process.platform

  let candidates: string[]
  if (platform === 'win32') {
    candidates = [
      path.join(homeDir, 'AISkills'),
      path.join(homeDir, 'Documents/AISkills'),
      `C:/Users/${os.userInfo().username}/AISkills`,
    ]
  } else if (platform === 'darwin') {
    candidates = [
      path.join(homeDir, 'AISkills'),
      path.join(homeDir, 'Documents/AISkills'),
    ]
  } else {
    candidates = [
      path.join(homeDir, '.local/share/aiskills'),
      path.join(homeDir, 'AISkills'),
      path.join(process.env.XDG_DATA_HOME || path.join(homeDir, '.local/share'), 'aiskills'),
    ]
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

/**
 * 合并检测结果和现有配置
 */
export function mergeWithExistingConfig(
  detectedApps: DetectedAppPath[],
  existingConfig: { apps?: DetectedAppPath[] } | null
): DetectedAppPath[] {
  if (!existingConfig || !existingConfig.apps) {
    return detectedApps
  }

  return detectedApps.map((detected) => {
    const existing = existingConfig.apps!.find(
      (a) => a.name.toLowerCase() === detected.name.toLowerCase()
    )

    if (existing && existing.skillsPath) {
      return {
        ...detected,
        skillsPath: existing.skillsPath,
        exists: fs.existsSync(existing.skillsPath),
      }
    }

    return detected
  })
}

/**
 * 根据 agent ID 获取项目级 skills 目录（相对路径）
 */
export function getProjectSkillsDir(agentId: string): string | null {
  const def = agentRegistry[agentId]
  return def ? def.projectPath : null
}

export default {
  agentRegistry,
  resolveGlobalPath,
  detectAppPath,
  detectAllAppPaths,
  detectMasterDir,
  mergeWithExistingConfig,
  getProjectSkillsDir,
}
