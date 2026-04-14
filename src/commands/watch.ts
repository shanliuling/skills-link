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
import { sync, pushToRemote, hasRemote } from '../core/git.js'

// 防抖定时器
let debounceTimer = null

/**
 * 运行 watch 命令
 */
export async function runWatch() {
  // 检查配置
  const { exists, config } = ensureConfig()
  if (!exists) return

  // 检查 master 目录
  if (!fs.existsSync(config.masterDir)) {
    logger.error('Master 目录不存在，请检查 config.yaml 中的 masterDir 路径')
    return
  }

  const debounceMs = config.watch?.debounceMs || 3000
  const gitEnabled = config.git?.enabled

  logger.title('文件监听')
  logger.info(`监听中: ${config.masterDir}`)
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
  const handleChange = async (event, filePath) => {
    const relativePath = filePath
      .replace(config.masterDir, '')
      .replace(/^[\/\\]/, '')
    logger.log(`  变更: ${relativePath}`)

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
    logger.error(`监听错误: ${error.message}`)
  })

  // 退出处理
  const handleExit = () => {
    logger.newline()
    logger.info('已停止监听')
    watcher.close()
    process.exit(0)
  }

  process.on('SIGINT', handleExit)
  process.on('SIGTERM', handleExit)

  // 保持进程运行
  logger.hint('按 Ctrl+C 停止监听')
}

/**
 * 执行同步
 * @param {Object} config - 配置对象
 * @param {boolean} gitEnabled - Git 是否启用
 */
async function performSync(config, gitEnabled) {
  if (!gitEnabled) {
    // Git 未启用，只打印日志
    logger.log(`  ${logger.dim('○')} 变更已记录（Git 未启用，跳过同步）`)
    return
  }

  // 执行同步
  const result = await sync(config.masterDir)

  if (!result.success) {
    logger.error(result.message)
    return
  }

  if (!result.hash) {
    // 没有变更需要提交
    return
  }

  logger.success(`已同步到 Git (commit: ${result.hash})`)

  // 推送
  if (config.git?.autoPush) {
    const hasRemoteConfig = await hasRemote(config.masterDir)
    if (hasRemoteConfig) {
      const pushResult = await pushToRemote(config.masterDir)
      if (pushResult.success) {
        logger.success(pushResult.message)
      } else {
        logger.error(pushResult.message)
      }
    }
  }
}

export default { runWatch }
