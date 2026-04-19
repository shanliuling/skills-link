/**
 * watch.js - 文件监听命令
 *
 * 启动文件监听，master 目录有变更时自动触发 sync
 * 使用 chokidar 监听，支持防抖配置
 */

import fs from 'fs'
import chokidar from 'chokidar'
import { logger } from '../core/logger.js'
import { ensureConfig } from '../core/config.js'
import { autoGitSync } from '../core/git.js'
import { t } from '../core/i18n.js'

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 运行 watch 命令
 */
export async function runWatch() {
  // 检查配置
  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  // 检查 master 目录
  if (!fs.existsSync(config.masterDir)) {
    logger.error(t('watch.masterDirNotExist'))
    return
  }

  const debounceMs = config.watch?.debounceMs || 3000
  const gitEnabled = config.git?.enabled

  logger.title(t('watch.title'))
  logger.info(t('watch.watching', { path: config.masterDir }))
  logger.newline()

  // 创建监听器
  const watcher = chokidar.watch(config.masterDir, {
    ignored: /(^|[\/\\])\..*|(node_modules)/,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  })

  // 变更事件处理
  const handleChange = async (event: string, filePath: string) => {
    const relativePath = filePath
      .replace(config.masterDir, '')
      .replace(/^[\/\\]/, '')
    logger.log(t('watch.changeDetected', { file: relativePath }))

    // 防抖
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(async () => {
      await performSync(config, gitEnabled)
    }, debounceMs)
  }

  // 绑定事件
  watcher
    .on('add', (path) => handleChange('add', path))
    .on('change', (path) => handleChange('change', path))
    .on('unlink', (path) => handleChange('unlink', path))
    .on('addDir', (path) => handleChange('addDir', path))
    .on('unlinkDir', (path) => handleChange('unlinkDir', path))

  // 错误处理
  watcher.on('error', (error) => {
    logger.error(t('watch.watcherError', { error: error.message }))
  })

  // 退出处理
  const handleExit = () => {
    logger.newline()
    logger.info(t('watch.stopped'))
    watcher.close()
    process.exit(0)
  }

  process.on('SIGINT', handleExit)
  process.on('SIGTERM', handleExit)

  // 保持进程运行
  logger.hint(t('watch.pressCtrlC'))
}

/**
 * 执行同步
 * @param {Object} config - 配置对象
 * @param {boolean} gitEnabled - Git 是否启用
 */
async function performSync(config: import('../core/config.js').GlobalConfig, gitEnabled: boolean) {
  if (!gitEnabled) {
    logger.log(t('watch.gitNotEnabled'))
    return
  }

  const result = await autoGitSync(
    config.masterDir,
    !!config.git?.autoPush,
  )

  if (!result.success) {
    logger.error(result.message)
    return
  }

  if (result.hash) {
    logger.success(t('watch.syncCompleteGit', { hash: result.hash }))
  }
}

export default { runWatch }
