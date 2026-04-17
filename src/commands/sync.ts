/**
 * sync.js - 手动 Git 同步命令
 *
 * 手动触发 Git 同步：git add . → git commit → git push
 * 若 git.enabled: false 则提示未启用并退出
 */

import fs from 'fs'
import { logger } from '../core/logger.js'
import { ensureConfig } from '../core/config.js'
import { sync, pushToRemote, hasRemote } from '../core/git.js'
import { t } from '../core/i18n.js'

export async function runSync(options: { message?: string } = {}) {
  const { message } = options

  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  if (!config.git || !config.git.enabled) {
    logger.warn(t('sync.gitNotEnabled'))
    logger.hint(t('sync.gitEnableHint'))
    return
  }

  if (!fs.existsSync(config.masterDir)) {
    logger.error(t('sync.masterDirNotExist'))
    return
  }

  logger.title(t('sync.title'))

  const result = await sync(config.masterDir, message)

  if (!result.success) {
    logger.error(result.message)
    return
  }

  if (!result.hash) {
    logger.info(t('sync.noChanges'))
    return
  }

  logger.success(t('sync.commitSuccess', { hash: result.hash }))

  if (!config.git.autoPush) {
    logger.hint(t('sync.autoPushDisabled'))
    return
  }

  const hasRemoteConfig = await hasRemote(config.masterDir)
  if (!hasRemoteConfig) {
    logger.warn(t('sync.noRemoteConfig'))
    logger.hint(t('sync.remoteConfigHint'))
    return
  }

  logger.info(t('sync.pushing'))
  const pushResult = await pushToRemote(config.masterDir)

  if (pushResult.success) {
    logger.success(t('sync.pushSuccess', { message: pushResult.message }))
  } else {
    logger.error(t('sync.pushFailed', { message: pushResult.message }))
  }
}

export default { runSync }
