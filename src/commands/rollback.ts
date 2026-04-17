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
import { t } from '../core/i18n.js'

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
    return t('rollback.daysAgo', { days })
  } else if (hours > 0) {
    return t('rollback.hoursAgo', { hours })
  } else if (minutes > 0) {
    return t('rollback.minutesAgo', { minutes })
  } else {
    return t('rollback.justNow')
  }
}

/**
 * 运行 rollback 命令
 */
export async function runRollback() {
  // 检查配置
  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  // 检查 Git 是否启用
  if (!config.git || !config.git.enabled) {
    logger.warn(t('rollback.gitNotEnabled'))
    logger.hint(t('rollback.gitNotEnabledHint'))
    return
  }

  // 检查 master 目录
  if (!fs.existsSync(config.masterDir)) {
    logger.error(t('rollback.masterDirNotExist'))
    return
  }

  // 检查是否是 Git 仓库
  const isRepo = await isGitRepo(config.masterDir)
  if (!isRepo) {
    logger.error(t('rollback.notAGitRepo'))
    logger.hint(t('rollback.runSetupHint'))
    return
  }

  logger.title(t('rollback.title'))

  // 获取提交历史
  const commits = await getCommitHistory(config.masterDir, 10)

  if (commits.length === 0) {
    logger.warn(t('rollback.noCommits'))
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
      message: t('rollback.selectCommit'),
      choices,
      pageSize: 10,
    },
  ])

  // 确认回滚
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: t('rollback.confirmRollback', { hash: selectedCommit.hash }),
      default: false,
    },
  ])

  if (!confirm) {
    logger.info(t('common.cancelled'))
    return
  }

  // 执行回滚
  logger.newline()
  logger.info(t('rollback.rollingBack'))

  const result = await rollbackToCommit(
    config.masterDir,
    selectedCommit.hash,
  )

  if (result.success) {
    logger.success(t('rollback.rollbackSuccess', { message: selectedCommit.hash }))
    logger.success(t('rollback.newCommitCreated'))
  } else {
    logger.error(result.message)
  }
}

export default { runRollback }
