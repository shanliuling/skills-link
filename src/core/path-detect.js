/**
 * path-detect.js - 跨平台路径智能探测模块
 *
 * 自动探测 AI 应用的 skills 路径，支持 Windows/macOS/Linux
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * 获取 Claude 应用的候选路径
 */
function getClaudeCandidates() {
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
function getGeminiCandidates() {
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
function getCodexCandidates() {
  const home = os.homedir()
  // 所有平台都使用 ~/.codex
  return [
    () => path.join(home, '.codex/skills'),
  ]
}

const APP_DEFINITIONS = [
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
]

export function detectAppPath(appName) {
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

export function detectAllAppPaths() {
  const results = []
  
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

export function detectMasterDir() {
  const homeDir = os.homedir()
  const platform = process.platform

  let candidates
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

export function mergeWithExistingConfig(detectedApps, existingConfig) {
  if (!existingConfig || !existingConfig.apps) {
    return detectedApps
  }

  return detectedApps.map((detected) => {
    const existing = existingConfig.apps.find(
      (a) => a.name.toLowerCase() === detected.name.toLowerCase()
    )
    
    if (existing && existing.skillsPath) {
      return {
        ...detected,
        skillsPath: existing.skillsPath,
        exists: fs.existsSync(existing.skillsPath),
        enabled: existing.enabled !== false,
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
