/**
 * link.js - 创建 symlink 命令
 *
 * 为 config 中所有 enabled 的应用创建 Junction symlink
 * 支持 --app 参数指定单个应用，--dry-run 预览操作
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { ensureConfig, getEnabledApps, findAppByName } from '../core/config.js'
import { createJunction, pathExists } from '../core/symlink.js'
import { t } from '../core/i18n.js'

export async function runLink(options: { app?: string; dryRun?: boolean } = {}) {
  const { app: appName, dryRun = false } = options

  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  if (!fs.existsSync(config.masterDir)) {
    logger.error(t('link.masterDirNotExist'))
    return
  }

  let apps = getEnabledApps(config)

  if (appName) {
    const app = findAppByName(config, appName)
    if (!app) {
      logger.error(t('link.appNotFound', { name: appName }))
      logger.hint(t('link.appListHint'))
      return
    }
    apps = [app]
  }

  if (apps.length === 0) {
    logger.warn(t('link.noEnabledApps'))
    return
  }

  logger.title(t('link.title'))
  logger.newline()

  if (dryRun) {
    logger.info(t('link.dryRunMode'))
    logger.newline()
  }

  let successCount = 0
  let failCount = 0

  for (const app of apps) {
    const { name, skillsPath } = app

    if (dryRun) {
      const result = createJunction(config.masterDir, skillsPath, true)
      logger.log(`  ${logger.dim('○')} ${name.padEnd(12)} → ${skillsPath}`)
      continue
    }

    const parentDir = path.dirname(skillsPath)
    if (!fs.existsSync(parentDir)) {
      logger.error(`${name.padEnd(12)} ${t('link.parentDirNotExist', { name: '', path: parentDir })}`)
      logger.hint(t('link.appNotInstalledHint'))
      failCount++
      continue
    }

    const result = createJunction(config.masterDir, skillsPath, false)

    if (result.success) {
      logger.success(t('link.linkSuccess', { name: name.padEnd(12), path: skillsPath }))
      if (result.backup) {
        logger.log(`    ${logger.dim(t('link.backupInfo', { path: result.backup }))}`)
      }
      successCount++
    } else {
      logger.error(t('link.linkFailed', { name: name.padEnd(12), error: result.message }))
      failCount++
    }
  }

  logger.newline()
  if (dryRun) {
    logger.hint(t('link.dryRunHint'))
  } else {
    if (successCount > 0) {
      logger.success(t('link.linksCreated', { count: successCount }))
    }
    if (failCount > 0) {
      logger.warn(t('link.linksFailed', { count: failCount }))
    }
  }
}

export default { runLink }
