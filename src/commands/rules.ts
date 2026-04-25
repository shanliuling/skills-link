/**
 * rules.ts - Rules 同步命令
 *
 * 一个命令搞定 rules 的收集和恢复
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { readConfig, writeConfig } from '../core/config.js'
import { collectRules, restoreRules, scanAllRules, checkRulesChanges } from '../core/rules-scanner.js'
import { autoGitSync, pullFromRemote, hasRemote, isGitRepo } from '../core/git.js'
import { initGit, addRemote } from '../core/git.js'
import { t } from '../core/i18n.js'

export async function runRules() {
  const config = readConfig()
  if (!config) {
    logger.error(t('rules.noConfig'))
    logger.hint(t('rules.runSetupFirst'))
    return
  }

  const masterDir = config.masterDir

  // 确保 masterDir 存在
  if (!fs.existsSync(masterDir)) {
    logger.error(t('rules.masterDirNotExist'))
    return
  }

  // 检查 Git 仓库
  const isRepo = await isGitRepo(masterDir)
  const hasRemoteConfigured = await hasRemote(masterDir)

  // 初始化 Git（如果需要）
  if (!isRepo) {
    logger.info(t('rules.initGit'))
    const result = await initGit(masterDir)
    if (!result.success) {
      logger.error(result.message)
      return
    }
  }

  // 如果有远程配置，先 pull
  if (hasRemoteConfigured) {
    logger.info(t('rules.pulling'))
    const pullResult = await pullFromRemote(masterDir)
    if (pullResult.success) {
      logger.success(t('rules.pullSuccess'))
    }
  }

  // 检测变更
  const changes = await checkRulesChanges(masterDir)

  // 扫描本地 rules
  const localRules = await scanAllRules()

  // 显示状态
  logger.newline()
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━')
  logger.log(t('rules.statusTitle'))
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━')

  if (localRules.length === 0) {
    logger.info(t('rules.noLocalRules'))
  } else {
    logger.log(t('rules.localRules') + ':')
    for (const rule of localRules) {
      logger.log(`  • ${rule.name} (${rule.files.length} ${t('rules.files')})`)
    }
  }

  logger.newline()

  if (changes.hasChanges) {
    logger.log(t('rules.changesDetected') + ':')
    if (changes.localOnly.length > 0) {
      logger.log(`  ${logger.infoText('↑')} ${t('rules.localOnly')} (${changes.localOnly.length}):`)
      for (const f of changes.localOnly.slice(0, 5)) {
        logger.log(`    ${f}`)
      }
      if (changes.localOnly.length > 5) {
        logger.log(`    ... +${changes.localOnly.length - 5}`)
      }
    }
    if (changes.remoteOnly.length > 0) {
      logger.log(`  ${logger.warnText('↓')} ${t('rules.remoteOnly')} (${changes.remoteOnly.length}):`)
      for (const f of changes.remoteOnly.slice(0, 5)) {
        logger.log(`    ${f}`)
      }
      if (changes.remoteOnly.length > 5) {
        logger.log(`    ... +${changes.remoteOnly.length - 5}`)
      }
    }
  } else {
    logger.log(t('rules.noChanges'))
  }

  logger.newline()

  // 询问用户选择
  if (!hasRemoteConfigured) {
    // 没有远程，先问用户要不要配置
    const { setupRemoteAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setupRemoteAction',
        message: t('rules.askSetupGit'),
        choices: [
          { name: t('rules.skipGit'), value: 'skip' },
          { name: t('rules.enterRemote'), value: 'enter' },
        ],
        default: 'skip',
      },
    ])

    if (setupRemoteAction === 'enter') {
      const { remoteUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'remoteUrl',
          message: t('rules.enterRemoteUrl'),
          validate: (input) => {
            if (!input) return t('rules.remoteRequired')
            if (!input.includes('github.com')) return t('rules.remoteInvalid')
            return true
          },
        },
      ])

      const result = await addRemote(masterDir, remoteUrl)
      if (result.success) {
        logger.success(t('rules.remoteAdded'))
      } else {
        logger.error(result.message)
        return
      }
    }
  }

  // 询问用户选择
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: t('rules.askChoice'),
      choices: [
        { name: t('rules.localFirst'), value: 'local' },
        { name: t('rules.remoteFirst'), value: 'remote' },
        { name: t('common.cancel'), value: 'cancel' },
      ],
    },
  ])

  if (choice === 'cancel') {
    logger.info(t('common.cancelled'))
    return
  }

  if (choice === 'local') {
    // 本地优先：收集本地上传到 Git
    logger.newline()
    logger.info(t('rules.collecting'))

    // 先 pull
    await pullFromRemote(masterDir)

    // 收集
    const count = await collectRules(masterDir)

    if (count > 0) {
      logger.success(t('rules.collected', { count }))

      // 推送（仅当 autoPush 启用时）
      const shouldPush = config.git?.autoPush && (hasRemoteConfigured || config.git?.enabled)
      if (shouldPush) {
        logger.newline()
        logger.info(t('rules.pushing'))
        const result = await autoGitSync(
          masterDir,
          true,  // 用户手动选择 sync，强制推送
          `rules sync: ${new Date().toISOString().split('T')[0]}`,
        )
        if (result.success) {
          logger.success(t('rules.pushSuccess'))
        } else {
          logger.error(result.message)
        }
      } else {
        logger.hint(t('rules.autoPushDisabled'))
      }
    } else {
      logger.info(t('rules.nothingToCollect'))
    }
  } else {
    // 远程优先：用 Git 的覆盖本地
    logger.newline()
    logger.info(t('rules.restoring'))

    // 先 pull
    await pullFromRemote(masterDir)

    // 恢复
    const count = await restoreRules(masterDir)

    if (count > 0) {
      logger.success(t('rules.restored', { count }))
    } else {
      logger.info(t('rules.nothingToRestore'))
    }
  }

  logger.newline()
  logger.success(t('rules.done'))
}

export default { runRules }
