/**
 * scanner.ts - 扫描现有 skills 目录
 *
 * 在用户目录下递归搜索包含 SKILL.md 文件的目录，识别为 skill
 * 支持 ignore 目录、深度限制等
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { glob } from 'glob'
import { logger } from './logger.js'
import { t } from './i18n.js'
import { agentRegistry, resolveGlobalPath } from './path-detect.js'

/**
 * Skill 信息接口
 */
export interface SkillInfo {
  name: string
  path: string
  sourceApp: string
}

/**
 * 扫描选项接口
 */
export interface ScanOptions {
  searchPaths?: string[]
  maxDepth?: number
  ignoreDirs?: string[]
}

/**
 * 复制结果接口
 */
export interface CopyResult {
  success: boolean
  message: string
  skipped?: boolean
}

/**
 * 列表 Skill 接口
 */
export interface ListSkillItem {
  name: string
  path: string
}

/**
 * 默认搜索路径（从 agent 注册表自动生成）
 */
export function getDefaultSearchPaths(): string[] {
  const paths = new Set<string>()
  for (const def of Object.values(agentRegistry)) {
    paths.add(resolveGlobalPath(def.globalPath))
  }
  return [...paths]
}

/**
 * 忽略的目录名（通用）
 */
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '__pycache__',
  '.cache',
  'cache',
]

/**
 * 忽略的路径模式（AI 应用自带的 skills，非用户下载）
 * 这些路径下的 skills 是 AI 应用内置的，不应被扫描
 */
const IGNORE_PATH_PATTERNS = [
  '/plugins/', // Claude 插件目录
  '/marketplaces/', // 插件市场
  '/external_plugins/', // 外部插件
  '/.claude-plugin/', // Claude 插件配置
  '/local-agent-mode-sessions/', // Claude 本地代理会话
  '/skills-plugin/', // 技能插件缓存
  '/.system/', // OpenAI Codex 系统内置技能容器
]

/**
 * 扫描 skills 目录
 */
export async function scanSkills(options: ScanOptions = {}): Promise<SkillInfo[]> {
  const {
    searchPaths = getDefaultSearchPaths(),
    maxDepth = 15,
    ignoreDirs = IGNORE_DIRS,
  } = options

  const skills: SkillInfo[] = []
  const seenPaths = new Set<string>()

  logger.info(t('import.scanning'))
  logger.newline()

  for (const searchPath of searchPaths) {
    if (!fs.existsSync(searchPath)) {
      continue
    }

    try {
      // 使用 glob 查找 SKILL.md 文件
      const pattern = path.join(searchPath, '**/SKILL.md').replace(/\\/g, '/')
      const matches = await glob(pattern, {
        ignore: ignoreDirs.map((d) => `**/${d}/**`),
        maxDepth: maxDepth,
        absolute: true,
        nocase: true,
        windowsPathsNoEscape: true,
        follow: false,
      })

      for (const skillFile of matches) {
        const skillDir = path.dirname(skillFile)
        const normalizedPath = path.normalize(skillDir)

        // 去重
        if (seenPaths.has(normalizedPath)) {
          continue
        }

        // 过滤 AI 应用自带的 skills（非用户下载）
        if (isBuiltInSkill(skillDir)) {
          continue
        }

        seenPaths.add(normalizedPath)

        // 获取 skill 名称
        const skillName = path.basename(skillDir)

        // 推断来源应用
        const sourceApp = inferSourceApp(skillDir)

        skills.push({
          name: skillName,
          path: skillDir,
          sourceApp,
        })
      }
    } catch (error) {
      // 忽略权限错误等
      continue
    }
  }

  return skills
}

/**
 * 检查是否是 AI 应用自带的 skill（非用户下载）
 */
function isBuiltInSkill(skillPath: string): boolean {
  const normalizedPath = skillPath.toLowerCase().replace(/\\/g, '/')

  return IGNORE_PATH_PATTERNS.some((pattern) =>
    normalizedPath.includes(pattern),
  )
}

/**
 * 推断 skill 来源应用（从 agent 注册表自动匹配）
 */
function inferSourceApp(skillPath: string): string {
  const normalizedPath = skillPath.toLowerCase().replace(/\\/g, '/')

  for (const [id, def] of Object.entries(agentRegistry)) {
    const globalPath = resolveGlobalPath(def.globalPath).toLowerCase().replace(/\\/g, '/')
    if (normalizedPath.includes(globalPath)) {
      return def.displayName
    }
  }

  return 'Unknown'
}

/**
 * 复制 skill 到目标目录
 */
export function copySkill(skillPath: string, targetDir: string, overwrite: boolean = false): CopyResult {
  const skillName = path.basename(skillPath)
  const destPath = path.join(targetDir, skillName)

  // 检查目标是否已存在
  if (fs.existsSync(destPath)) {
    if (!overwrite) {
      return {
        success: false,
        skipped: true,
        message: `已存在同名 skill: ${skillName}`,
      }
    }
    // 覆盖：先删除
    try {
      fs.rmSync(destPath, { recursive: true, force: true })
    } catch (error) {
      return {
        success: false,
        message: `删除现有目录失败: ${(error as Error).message}`,
      }
    }
  }

  // 复制目录
  try {
    fs.mkdirSync(targetDir, { recursive: true })
    copyDirRecursive(skillPath, destPath)
    return {
      success: true,
      message: `已复制: ${skillName}`,
    }
  } catch (error) {
    return {
      success: false,
      message: `复制失败: ${(error as Error).message}`,
    }
  }
}

/**
 * 递归复制目录
 */
function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * 统计 master 目录中的 skills 数量
 */
export function countSkills(masterDir: string): number {
  if (!fs.existsSync(masterDir)) {
    return 0
  }

  try {
    const entries = fs.readdirSync(masterDir, { withFileTypes: true })
    return entries.filter((entry) => {
      if (!entry.isDirectory()) return false
      const skillFile = path.join(masterDir, entry.name, 'SKILL.md')
      return fs.existsSync(skillFile)
    }).length
  } catch {
    return 0
  }
}

/**
 * 列出 master 目录中的 skills
 */
export function listSkills(masterDir: string): ListSkillItem[] {
  if (!fs.existsSync(masterDir)) {
    return []
  }

  try {
    const entries = fs.readdirSync(masterDir, { withFileTypes: true })
    return entries
      .filter((entry) => {
        if (!entry.isDirectory()) return false
        const skillFile = path.join(masterDir, entry.name, 'SKILL.md')
        return fs.existsSync(skillFile)
      })
      .map((entry) => ({
        name: entry.name,
        path: path.join(masterDir, entry.name),
      }))
  } catch {
    return []
  }
}

export default {
  getDefaultSearchPaths,
  scanSkills,
  copySkill,
  countSkills,
  listSkills,
}
