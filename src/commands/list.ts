/**
 * list.ts - 列出 skills 命令
 *
 * 扫描所有平台的 skills，去重后按名称分组显示
 */

import { logger } from '../core/logger.js'
import { scanSkills } from '../core/scanner.js'
import { t } from '../core/i18n.js'

interface DeduplicatedSkill {
  name: string
  paths: string[]
  sourceApps: string[]
}

/**
 * 去重并按名称分组
 */
function deduplicateSkills(skills: { name: string; path: string; sourceApp: string }[]): DeduplicatedSkill[] {
  const map = new Map<string, DeduplicatedSkill>()

  for (const skill of skills) {
    if (!map.has(skill.name)) {
      map.set(skill.name, {
        name: skill.name,
        paths: [skill.path],
        sourceApps: [skill.sourceApp],
      })
    } else {
      const existing = map.get(skill.name)!
      if (!existing.paths.includes(skill.path)) {
        existing.paths.push(skill.path)
      }
      if (!existing.sourceApps.includes(skill.sourceApp)) {
        existing.sourceApps.push(skill.sourceApp)
      }
    }
  }

  return Array.from(map.values())
}

/**
 * 运行 list 命令
 */
export async function runList() {
  logger.title(t('list.title'))
  logger.newline()

  const skills = await scanSkills()

  if (skills.length === 0) {
    logger.warn(t('list.noSkillsFound'))
    logger.newline()
    logger.log(t('list.skillHint'))
    logger.log(t('list.manualCopyHint'))
    return
  }

  const deduplicated = deduplicateSkills(skills)

  logger.success(t('list.found', { count: deduplicated.length }))
  logger.newline()

  for (const skill of deduplicated) {
    const padEnd = 20
    const displayName = skill.name.length > padEnd - 1
      ? skill.name.substring(0, padEnd - 2) + '..'
      : skill.name

    // 来源显示：全显示，用 / 分隔
    const sourceLabel = skill.sourceApps.join(' / ')

    logger.log(`  ${logger.successText('✔')} ${displayName.padEnd(padEnd)} ${t('list.fromApp', { app: sourceLabel })}`)
  }

  if (deduplicated.length < skills.length) {
    logger.newline()
    logger.log(logger.dim(`(${skills.length - deduplicated.length} 个重复项已合并)`))
  }

  logger.newline()
  logger.hint(t('list.importHint'))
}

export default { runList }
