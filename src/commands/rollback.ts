/**
 * rollback.js - Git 回滚命令
 *
 * 列出最近的 commit，让用户选择回滚到哪个版本
 * 仅在 git.enabled: true 时可用
 */

import fs from 'fs'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { ensureConfig } from '../core/config.js'
import { getCommitHistory, rollbackToCommit, isGitRepo } from '../core/git.js'

/**
 * 格式化相对时间
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return date.toLocaleDateString()
  } else if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}

/**
 * 运行 rollback 命令
 */
export async function runRollback() {
  // 检查配置
  const { exists, config } = ensureConfig()
  if (!exists) return

  // 检查 Git 是否启用
  if (!config.git || !config.git.enabled) {
    logger.warn('Git 同步未启用')
    logger.hint('在 config.yaml 中设置 git.enabled: true 以启用 Git 同步')
    return
  }

  // 检查 master 目录
  if (!fs.existsSync(config.masterDir)) {
    logger.error('Master 目录不存在，请检查 config.yaml 中的 masterDir 路径')
    return
  }

  // 检查是否是 Git 仓库
  const isRepo = await isGitRepo(config.masterDir)
  if (!isRepo) {
    logger.error('Master 目录不是 Git 仓库')
    logger.hint('运行 skills-link setup 重新初始化 Git')
    return
  }

  logger.title('Git 回滚')

  // 获取提交历史
  const commits = await getCommitHistory(config.masterDir, 10)

  if (commits.length === 0) {
    logger.warn('没有提交历史')
    return
  }

  logger.newline()

  // 构建选项
  const choices = commits.map((commit) => {
    const date = new Date(commit.date)
    const relativeDate = formatRelativeTime(date)
    return {
      name: `${commit.hash}  ${commit.message.padEnd(30)}  (${relativeDate})`,
      value: commit,
      short: commit.hash,
    }
  })

  // 让用户选择
  const { selectedCommit } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedCommit',
      message: '选择要回滚的版本',
      choices,
      pageSize: 10,
    },
  ])

  // 确认回滚
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `确认回滚到 ${selectedCommit.hash}？`,
      default: false,
    },
  ])

  if (!confirm) {
    logger.info('已取消')
    return
  }

  // 执行回滚
  logger.newline()
  logger.info('正在回滚...')

  const result = await rollbackToCommit(
    config.masterDir,
    selectedCommit.fullHash,
  )

  if (result.success) {
    logger.success(`已回滚到 ${selectedCommit.hash}`)
    logger.success('新 commit 已创建')
  } else {
    logger.error(result.message)
  }
}

export default { runRollback }
