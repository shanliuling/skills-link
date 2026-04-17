/**
 * list.js - 列出用户自行下载的 skills 命令
 *
 * 扫描电脑上用户自行下载的 skills（非 AI 应用内置），显示列表
 */

import fs from 'fs'
import { logger } from '../core/logger.js'
import { scanSkills } from '../core/scanner.js'
import { t } from '../core/i18n.js'

/**
 * 运行 list 命令
 */
export async function runList() {
  logger.title(t('list.title'))
  logger.newline()

  // 扫描 skills
  const skills = await scanSkills()

  if (skills.length === 0) {
    logger.warn(t('list.noSkillsFound'))
    logger.newline()
    logger.log(t('list.skillHint'))
    logger.log(t('list.manualCopyHint'))
    return
  }

  // 显示找到的 skills
  logger.success(t('list.found', { count: skills.length }))
  logger.newline()

  for (const skill of skills) {
    const padEnd = 20
    const name =
      skill.name.length > padEnd - 1
        ? skill.name.substring(0, padEnd - 2) + '..'
        : skill.name
    logger.log(
      `  ${logger.successText('✔')} ${name.padEnd(padEnd)} ${t('list.fromApp', { app: skill.sourceApp })}`,
    )
    logger.log(`    ${logger.dim(skill.path)}`)
  }

  logger.newline()
  logger.hint(t('list.importHint'))
}

export default { runList }
