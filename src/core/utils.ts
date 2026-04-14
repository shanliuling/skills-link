/**
 * utils.ts - 通用工具函数
 */

import fs from 'fs'
import path from 'path'

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

export default {
  getSkillModTime,
}
