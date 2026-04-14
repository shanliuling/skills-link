/**
 * path-detect.ts - 跨平台路径智能探测模块
 *
 * 自动探测 AI 应用的 skills 路径，支持 Windows/macOS/Linux
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * 应用定义接口
 */
interface AppDefinition {
  name: string
  candidates: Array<(() => string | null)>
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

/**
 * 获取 Claude 应用的候选路径
 */
function getClaudeCandidates(): Array<() => string | null> {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'win32') {
    // Windows: AppData/Roaming 或 AppData/Local
    return [
      () => path.join(home, 'AppData/Roaming/Claude/skills'),
      () => path.join(process.env.APPDATA || '', 'Claude/skills'),
      () => path.join(process.env.LOCALAPPDATA || '', 'Claude/skills'),
      () => `C:/Users/${os.userInfo().username}/AppData/Roaming/Claude/skills`,
    ]
  } else if (platform === 'darwin') {
    // macOS: Library/Application Support 或 .config
    return [
      () => path.join(home, 'Library/Application Support/Claude/skills'),
      () => path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'claude/skills'),
    ]
  } else {
    // Linux: .config 或 .local/share
    return [
      () => path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'claude/skills'),
      () => path.join(home, '.local/share/claude/skills'),
      () => path.join(home, '.claude/skills'),
    ]
  }
}

/**
 * 获取 Gemini CLI 应用的候选路径
 */
function getGeminiCandidates(): Array<() => string | null> {
  const home = os.homedir()
  // 所有平台都使用 ~/.gemini
  return [
    () => path.join(home, '.gemini/skills'),
    () => process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.gemini/skills') : null,
  ]
}

/**
 * 获取 Codex 应用的候选路径
 */
function getCodexCandidates(): Array<() => string | null> {
  const home = os.homedir()
  // 所有平台都使用 ~/.codex
  return [
    () => path.join(home, '.codex/skills'),
  ]
}

/**
 * 获取 Cursor 应用的候选路径
 */
function getCursorCandidates(): Array<() => string | null> {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'win32') {
    return [
      () => path.join(home, 'AppData/Roaming/Cursor/User/skills'),
      () => path.join(home, '.cursor/skills'),
    ]
  } else if (platform === 'darwin') {
    return [
      () => path.join(home, 'Library/Application Support/Cursor/User/skills'),
      () => path.join(home, '.cursor/skills'),
    ]
  } else {
    return [
      () => path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'cursor/skills'),
      () => path.join(home, '.cursor/skills'),
    ]
  }
}

/**
 * 获取 Windsurf 应用的候选路径
 */
function getWindsurfCandidates(): Array<() => string | null> {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'win32') {
    return [
      () => path.join(home, 'AppData/Roaming/Windsurf/skills'),
      () => path.join(home, '.windsurf/skills'),
    ]
  } else if (platform === 'darwin') {
    return [
      () => path.join(home, 'Library/Application Support/Windsurf/skills'),
      () => path.join(home, '.windsurf/skills'),
    ]
  } else {
    return [
      () => path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'windsurf/skills'),
      () => path.join(home, '.windsurf/skills'),
    ]
  }
}

/**
 * 获取 GitHub Copilot 应用的候选路径
 */
function getCopilotCandidates(): Array<() => string | null> {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'win32') {
    return [
      () => path.join(home, '.copilot/skills'),
      () => path.join(home, 'AppData/Local/GitHubDesktop/skills'),
    ]
  } else if (platform === 'darwin') {
    return [
      () => path.join(home, '.copilot/skills'),
      () => path.join(home, 'Library/Application Support/GitHub Desktop/skills'),
    ]
  } else {
    return [
      () => path.join(home, '.copilot/skills'),
      () => path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'copilot/skills'),
    ]
  }
}

/**
 * 获取 Cline 应用的候选路径
 */
function getClineCandidates(): Array<() => string | null> {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'win32') {
    return [
      () => path.join(home, 'AppData/Roaming/Code/User/globalStorage/saoudrizwan.claude-dev/skills'),
      () => path.join(home, '.cline/skills'),
    ]
  } else if (platform === 'darwin') {
    return [
      () => path.join(home, 'Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/skills'),
      () => path.join(home, '.cline/skills'),
    ]
  } else {
    return [
      () => path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Code/User/globalStorage/saoudrizwan.claude-dev/skills'),
      () => path.join(home, '.cline/skills'),
    ]
  }
}

/**
 * 获取 Continue 应用的候选路径
 */
function getContinueCandidates(): Array<() => string | null> {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'win32') {
    return [
      () => path.join(home, '.continue/skills'),
      () => path.join(home, 'AppData/Roaming/Continue/skills'),
    ]
  } else if (platform === 'darwin') {
    return [
      () => path.join(home, '.continue/skills'),
      () => path.join(home, 'Library/Application Support/Continue/skills'),
    ]
  } else {
    return [
      () => path.join(home, '.continue/skills'),
      () => path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'continue/skills'),
    ]
  }
}

/**
 * 获取 Roo Code 应用的候选路径
 */
function getRooCodeCandidates(): Array<() => string | null> {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'win32') {
    return [
      () => path.join(home, 'AppData/Roaming/Code/User/globalStorage/rooveterinaryinc.roo-cline/skills'),
      () => path.join(home, '.roo-code/skills'),
    ]
  } else if (platform === 'darwin') {
    return [
      () => path.join(home, 'Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/skills'),
      () => path.join(home, '.roo-code/skills'),
    ]
  } else {
    return [
      () => path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Code/User/globalStorage/rooveterinaryinc.roo-cline/skills'),
      () => path.join(home, '.roo-code/skills'),
    ]
  }
}

/**
 * 应用定义列表（支持 10+ AI 代理）
 */
const APP_DEFINITIONS: AppDefinition[] = [
  {
    name: 'Claude',
    candidates: getClaudeCandidates(),
  },
  {
    name: 'Gemini CLI',
    candidates: getGeminiCandidates(),
  },
  {
    name: 'Codex',
    candidates: getCodexCandidates(),
  },
  {
    name: 'Cursor',
    candidates: getCursorCandidates(),
  },
  {
    name: 'Windsurf',
    candidates: getWindsurfCandidates(),
  },
  {
    name: 'GitHub Copilot',
    candidates: getCopilotCandidates(),
  },
  {
    name: 'Cline',
    candidates: getClineCandidates(),
  },
  {
    name: 'Continue',
    candidates: getContinueCandidates(),
  },
  {
    name: 'Roo Code',
    candidates: getRooCodeCandidates(),
  },
]

/**
 * 检测应用路径
 */
export function detectAppPath(appName: string): string | null {
  const appDef = APP_DEFINITIONS.find(
    (a) => a.name.toLowerCase() === appName.toLowerCase()
  )

  if (!appDef) return null

  for (const getCandidate of appDef.candidates) {
    try {
      const candidatePath = getCandidate()
      if (candidatePath && fs.existsSync(candidatePath)) {
        return candidatePath
      }
    } catch {
      // ignore
    }
  }

  // 回退到第一个候选路径（即使不存在）
  const fallback = appDef.candidates[0]()
  return fallback || null
}

/**
 * 检测所有应用路径
 */
export function detectAllAppPaths(): DetectedAppPath[] {
  const results: DetectedAppPath[] = []

  for (const appDef of APP_DEFINITIONS) {
    const detectedPath = detectAppPath(appDef.name)
    const exists = detectedPath ? fs.existsSync(detectedPath) : false

    results.push({
      name: appDef.name,
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
    // Windows: 用户目录或文档目录
    candidates = [
      path.join(homeDir, 'AISkills'),
      path.join(homeDir, 'Documents/AISkills'),
      `C:/Users/${os.userInfo().username}/AISkills`,
    ]
  } else if (platform === 'darwin') {
    // macOS: 用户目录或文档目录
    candidates = [
      path.join(homeDir, 'AISkills'),
      path.join(homeDir, 'Documents/AISkills'),
    ]
  } else {
    // Linux: .local/share 或用户目录
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

export default {
  detectAppPath,
  detectAllAppPaths,
  detectMasterDir,
  mergeWithExistingConfig,
}
