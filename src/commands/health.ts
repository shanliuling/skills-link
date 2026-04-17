/**
 * health.js - 健康检查命令
 *
 * 检查所有 symlink 状态，输出报告
 * 包括应用状态、master 目录信息、Git 状态
 */

import fs from 'fs'
import { logger } from '../core/logger.js'
import { ensureConfig } from '../core/config.js'
import { checkAllLinks, LinkStatus } from '../core/symlink.js'
import { isGitRepo, getLastSyncTime } from '../core/git.js'
import { countSkills } from '../core/scanner.js'
import { t } from '../core/i18n.js'

export async function runHealth() {
  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  logger.title(t('health.title'))
  logger.newline()

  if (!fs.existsSync(config.masterDir)) {
    logger.error(t('health.masterDirNotExist'))
    return
  }

  const linkStatuses = checkAllLinks(config)

  let okCount = 0
  let notLinkedCount = 0
  let notInstalledCount = 0
  let problemCount = 0

  for (const item of linkStatuses) {
    const { status, message } = item
    const name = item.name.padEnd(12)

    switch (status) {
      case LinkStatus.OK:
        logger.success(`${name} ${t('health.statusOk')}`)
        okCount++
        break

      case LinkStatus.NOT_INSTALLED:
        logger.log(`${logger.dim('○')} ${name} ${logger.dim(t('health.statusNotInstalled'))}`)
        notInstalledCount++
        break

      case LinkStatus.NOT_LINKED:
        logger.warn(
          `${name} ${t('health.statusNotLinked')}  →  ${t('health.fixLinkHint', { name: item.name })}`,
        )
        notLinkedCount++
        break

      case LinkStatus.WRONG_TARGET:
        logger.warn(
          `${name} ${t('health.statusWrongTarget')}  →  ${t('health.fixWrongTargetHint', { name: item.name })}`,
        )
        problemCount++
        break

      default:
        logger.error(`${name} ${message}`)
        problemCount++
    }
  }

  logger.newline()

  const skillCount = countSkills(config.masterDir)
  logger.log(t('health.masterDirInfo', { path: config.masterDir, count: skillCount }))

  if (config.git?.enabled) {
    const isRepo = await isGitRepo(config.masterDir)
    if (isRepo) {
      const lastSync = await getLastSyncTime(config.masterDir)
      logger.log(t('health.gitStatusEnabled', { time: lastSync || '未知' }))
    } else {
      logger.warn(t('health.gitStatusEnabledNoRepo'))
    }
  } else {
    logger.log(t('health.gitStatusDisabled'))
  }

  logger.newline()

  if (problemCount === 0 && notLinkedCount === 0) {
    logger.success(t('health.allAppsOk'))
    if (notInstalledCount > 0) {
      logger.log(`${logger.dim(t('health.appsNotInstalled', { count: notInstalledCount }))}`)
    }
  } else {
    if (notLinkedCount > 0) {
      logger.warn(t('health.appsNeedLinks', { count: notLinkedCount }))
    }
    if (problemCount > 0) {
      logger.warn(t('health.appsNeedFix', { count: problemCount }))
    }
  }
}

export default { runHealth }
