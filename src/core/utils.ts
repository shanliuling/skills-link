/**
 * utils.ts - 通用工具函数
 */

import fs from 'fs'
import path from 'path'
import type { SkillInfo } from './scanner.js'

/**
 * 获取 skill 的最后修改时间
 */
export function getSkillModTime(skillPath: string): Date {
  try {
    const skillFile = path.join(skillPath, 'SKILL.md')
    if (fs.existsSync(skillFile)) {
      const stats = fs.statSync(skillFile)
      return stats.mtime
    }
    const stats = fs.statSync(skillPath)
    return stats.mtime
  } catch {
    return new Date(0)
  }
}

/**
 * 对 skills 按名称分组，每组内按修改时间降序排列（最新在前）
 */
export function groupAndDedupSkills(skills: SkillInfo[]): SkillInfo[] {
  const groups: Record<string, SkillInfo[]> = {}
  for (const skill of skills) {
    if (!groups[skill.name]) {
      groups[skill.name] = []
    }
    groups[skill.name].push(skill)
  }

  const result: SkillInfo[] = []
  for (const name of Object.keys(groups)) {
    const duplicates = groups[name]
    duplicates.sort(
      (a, b) => getSkillModTime(b.path).getTime() - getSkillModTime(a.path).getTime(),
    )
    result.push(duplicates[0])
  }
  return result
}

export default {
  getSkillModTime,
  groupAndDedupSkills,
}
