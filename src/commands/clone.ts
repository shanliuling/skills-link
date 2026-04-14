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

/**
 * 运行 clone 命令
 * @param {Object} options - 命令选项
 * @param {string} options.repo - 远程仓库 URL（可选）
 */
export async function runClone(options: { repo?: string } = {}) {
  const { repo } = options

  logger.title('从 GitHub 克隆 Skills')
  logger.newline()

  // 检查是否已有配置
  let config
  let masterDir
  let remoteUrl = repo

  if (configExists()) {
    config = readConfig()
    if (config) {
      masterDir = config.masterDir
      if (!remoteUrl && config.git?.remote) {
        remoteUrl = config.git.remote
      }
    }
    logger.info('使用现有配置')
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
    logger.success('已创建默认配置')
  }

  // 检查是否有远程仓库 URL
  if (!remoteUrl) {
    logger.error('没有指定远程仓库 URL')
    logger.hint('使用: skills-sync clone <repo-url>')
    logger.hint('或在 config.yaml 中配置 git.remote')
    return
  }

  logger.info(`远程仓库: ${remoteUrl}`)
  logger.info(`目标目录: ${masterDir}`)
  logger.newline()

  // 检查 master 目录是否已存在
  if (fs.existsSync(masterDir)) {
    const entries = fs.readdirSync(masterDir)
    if (entries.length > 0) {
      logger.error(`目录 ${masterDir} 已存在且不为空`)
      logger.hint('请先删除或移动该目录，或使用 skills-sync link 创建链接')
      return
    }
  }

  // 克隆仓库
  logger.info('正在克隆...')
  const result = await cloneRepo(remoteUrl, masterDir)

  if (!result.success) {
    logger.error(`克隆失败: ${result.message}`)
    return
  }

  logger.success('克隆完成！')
  logger.newline()

  // 统计 skills 数量
  const skillDirs = fs
    .readdirSync(masterDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(masterDir, entry.name, 'SKILL.md')),
    )

  logger.success(`共有 ${skillDirs.length} 个 skills`)
  logger.newline()

  // 创建 Junction 链接
  logger.info('创建符号链接...')
  const enabledApps = config.apps?.filter((app) => app.enabled !== false) || []

  let linkCount = 0
  for (const app of enabledApps) {
    const parentDir = path.dirname(app.skillsPath)
    if (!fs.existsSync(parentDir)) {
      logger.log(`  ${logger.dim('○')} ${app.name} 未安装，跳过`)
      continue
    }

    const linkResult = createJunction(masterDir, app.skillsPath, false)
    if (linkResult.success) {
      logger.success(`${app.name} → ${app.skillsPath}`)
      if (linkResult.backup) {
        logger.log(`    ${logger.dim('已备份原目录')}`)
      }
      linkCount++
    } else {
      logger.error(`${app.name} 创建失败`)
    }
  }

  if (linkCount > 0) {
    logger.success(`已为 ${linkCount} 个应用创建链接`)
  }

  // 完成
  logger.newline()
  logger.success('克隆完成！')
  logger.hint('现在所有 AI 应用共享同一个 skills 目录')
}

export default { runClone }
