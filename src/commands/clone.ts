/**
 * clone.js - 从 GitHub 克隆 skills 仓库
 *
 * 用于新电脑首次使用，从远程仓库克隆 skills 并创建链接
 */

import fs from 'fs'
import path from 'path'
import { logger } from '../core/logger.js'
import {
  getDefaultConfig,
  writeConfig,
  configExists,
  readConfig,
} from '../core/config.js'
import { cloneRepo } from '../core/git.js'
import { createJunction } from '../core/symlink.js'
import {
  detectAllAppPaths,
  detectMasterDir,
  mergeWithExistingConfig,
} from '../core/path-detect.js'
import { t } from '../core/i18n.js'

/**
 * 运行 clone 命令
 * @param {Object} options - 命令选项
 * @param {string} options.repo - 远程仓库 URL（可选）
 */
export async function runClone(options: { repo?: string } = {}) {
  const { repo } = options

  logger.title(t('clone.title'))
  logger.newline()

  // 检查是否已有配置
  let config: import('../core/config.js').GlobalConfig | null
  let masterDir: string | undefined
  let remoteUrl: string | undefined = repo

  if (configExists()) {
    config = readConfig()
    if (config) {
      masterDir = config.masterDir
      if (!remoteUrl && config.git?.remote) {
        remoteUrl = config.git.remote
      }
    }
    logger.info(t('clone.usingExistingConfig'))
  } else {
    // 创建默认配置
    const defaultConfig = getDefaultConfig()
    const detectedMasterDir = detectMasterDir()
    const detectedApps = detectAllAppPaths()
    const mergedApps = mergeWithExistingConfig(detectedApps, null)

    defaultConfig.masterDir = detectedMasterDir
    defaultConfig.apps = mergedApps.map((app) => ({
      name: app.name,
      skillsPath: app.skillsPath || '',
      enabled: app.enabled !== false,
    }))
    writeConfig(defaultConfig)
    config = defaultConfig
    masterDir = config.masterDir
    if (!remoteUrl && config.git?.remote) {
      remoteUrl = config.git.remote
    }
    logger.success(t('clone.defaultConfigCreated'))
  }

  // 检查是否有远程仓库 URL
  if (!config || !masterDir) {
    logger.error(t('clone.noRepoUrl'))
    return
  }

  if (!remoteUrl) {
    logger.error(t('clone.noRepoUrl'))
    logger.hint(t('clone.usageHint'))
    logger.hint(t('clone.orConfigRemote'))
    return
  }

  logger.info(t('clone.remoteRepo', { url: remoteUrl }))
  logger.info(t('clone.targetDir', { path: masterDir }))
  logger.newline()

  // 检查 master 目录是否已存在
  if (fs.existsSync(masterDir)) {
    const entries = fs.readdirSync(masterDir)
    if (entries.length > 0) {
      logger.error(t('start.dirExistsNotEmpty', { path: masterDir }))
      logger.hint(t('clone.dirNotEmptyHint'))
      return
    }
  }

  // 克隆仓库
  logger.info(t('start.cloning'))
  const result = await cloneRepo(remoteUrl, masterDir)

  if (!result.success) {
    logger.error(t('clone.cloneFailed', { error: result.message }))
    return
  }

  logger.success(t('clone.cloneSuccess'))
  logger.newline()

  // 统计 skills 数量
  const skillDirs = fs
    .readdirSync(masterDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(masterDir, entry.name, 'SKILL.md')),
    )

  logger.success(t('clone.complete', { count: skillDirs.length }))
  logger.newline()

  // 创建 Junction 链接
  logger.info(t('clone.creatingLinks'))
  const enabledApps = config.apps?.filter((app) => app.enabled !== false) || []

  let linkCount = 0
  for (const app of enabledApps) {
    const parentDir = path.dirname(app.skillsPath)
    if (!fs.existsSync(parentDir)) {
      logger.log(`  ${logger.dim('○')} ${t('start.appNotInstalled', { name: app.name })}`)
      continue
    }

    const linkResult = createJunction(masterDir, app.skillsPath, false)
    if (linkResult.success) {
      logger.success(t('link.linkSuccess', { name: app.name, path: app.skillsPath }))
      if (linkResult.backup) {
        logger.log(`    ${logger.dim(t('init.backupDir'))}`)
      }
      linkCount++
    } else {
      logger.error(t('start.appLinkFailed', { name: app.name }))
    }
  }

  if (linkCount > 0) {
    logger.success(t('start.linksCreated', { count: linkCount }))
  }

  // 完成
  logger.newline()
  logger.success(t('clone.cloneSuccess'))
  logger.hint(t('init.shareHint'))
}

export default { runClone }
