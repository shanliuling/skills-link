/**
 * remove.ts - 删除 skills 命令
 *
 * 列出 masterDir 中的 skills，用户多选后删除
 * 删除后自动 Git commit
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { ensureConfig } from '../core/config.js'
import { countSkills } from '../core/scanner.js'
import { t } from '../core/i18n.js'
import { autoGitSync } from '../core/git.js'

/**
 * 获取 masterDir 中的 skills 列表
 */
function getSkillsInMasterDir(masterDir: string): string[] {
  if (!fs.existsSync(masterDir)) return []

  try {
    return fs
      .readdirSync(masterDir, { withFileTypes: true })
      .filter((entry) => {
        if (!entry.isDirectory()) return false
        const skillFile = path.join(masterDir, entry.name, 'SKILL.md')
        return fs.existsSync(skillFile)
      })
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

/**
 * 运行 remove 命令
 */
export async function runRemove() {
  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  if (!fs.existsSync(config.masterDir)) {
    logger.error(t('remove.masterDirNotExist'))
    return
  }

  const skills = getSkillsInMasterDir(config.masterDir)

  if (skills.length === 0) {
    logger.warn(t('remove.noSkills'))
    return
  }

  logger.title(t('remove.title'))
  logger.newline()

  // 多选
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: t('remove.selectPrompt'),
      choices: skills.map((name) => ({ name, value: name })),
      validate: (answer) => {
        if (answer.length === 0) return t('remove.selectAtLeastOne')
        return true
      },
    },
  ])

  // 确认
  logger.newline()
  logger.warn(t('remove.confirmWarning', { count: selected.length }))
  for (const name of selected) {
    logger.log(`  - ${name}`)
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: t('remove.confirmPrompt'),
      default: false,
    },
  ])

  if (!confirm) {
    logger.info(t('common.cancelled'))
    return
  }

  // 执行删除
  logger.newline()
  let successCount = 0
  let failCount = 0

  for (const name of selected) {
    const skillPath = path.join(config.masterDir, name)
    try {
      fs.rmSync(skillPath, { recursive: true, force: true })
      logger.success(t('remove.deleted', { name }))
      successCount++
    } catch (error) {
      logger.error(t('remove.deleteFailed', { name, error: (error as Error).message }))
      failCount++
    }
  }

  logger.newline()
  if (successCount > 0) {
    logger.success(t('remove.result', { count: successCount }))
  }
  if (failCount > 0) {
    logger.error(t('remove.failResult', { count: failCount }))
  }

  // Git 同步
  if (config?.git?.enabled && successCount > 0) {
    logger.newline()
    logger.info(t('remove.syncing'))

    const result = await autoGitSync(
      config.masterDir,
      !!config.git.autoPush,
      `remove: ${selected.join(', ')}`,
    )

    if (result.success && result.hash) {
      logger.success(t('remove.syncSuccess', { hash: result.hash }))
      if (config.git.autoPush) {
        logger.success(t('remove.pushSuccess'))
      }
    } else if (!result.success) {
      logger.error(t('remove.syncFailed', { error: result.message }))
    }
  }
}

export default { runRemove }
