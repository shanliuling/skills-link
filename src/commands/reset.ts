/**
 * reset.ts - 重置命令
 *
 * 还原到未使用 skills-link 前的状态
 * - 删除所有符号链接
 * - 恢复备份目录
 * - 删除 AISkills 目录
 * - 删除配置文件
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { readConfig, GlobalConfig, getConfigPath } from '../core/config.js'
import { isSymlink, getSymlinkTarget, removeSymlink } from '../core/symlink.js'
import { countSkills } from '../core/scanner.js'
import { t } from '../core/i18n.js'

/**
 * 检测到的改动
 */
interface DetectedChanges {
  configFile: string | null
  masterDir: { path: string; skillCount: number } | null
  symlinks: Array<{ app: string; path: string; target: string }>
  backups: Array<{ app: string; backupPath: string; originalPath: string }>
}

/**
 * 运行 reset 命令
 */
export async function runReset(options: { dryRun?: boolean } = {}) {
  const { dryRun = false } = options

  logger.title(t('reset.title'))
  logger.newline()

  // 1. 读取配置
  const config = readConfig()

  if (!config) {
    logger.warn(t('reset.noConfig'))
    return
  }

  // 2. 检测所有改动
  logger.info(t('reset.detecting'))
  const changes = detectChanges(config)

  const hasWork =
    Boolean(changes.configFile) ||
    Boolean(changes.masterDir) ||
    changes.symlinks.length > 0 ||
    changes.backups.length > 0

  if (!hasWork) {
    logger.warn(t('reset.noChanges'))
    logger.hint(t('reset.noChangesHint'))
    return
  }

  logger.newline()

  // 3. 显示检测结果
  displayChanges(changes)

  // 4. 如果是 dry-run，只显示预览
  if (dryRun) {
    logger.newline()
    logger.info(t('reset.dryRunPreview'))
    logger.hint(t('reset.dryRunHint'))
    return
  }

  // 5. 确认执行
  logger.newline()
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: t('reset.confirmMessage'),
      default: false,
    },
  ])

  if (!confirm) {
    logger.info(t('common.cancelled'))
    return
  }

  // 6. 执行重置
  logger.newline()
  logger.info(t('reset.executing'))
  executeReset(changes)

  // 7. 完成
  logger.newline()
  logger.success(t('reset.complete'))
  logger.hint(t('reset.restartHint'))
}

/**
 * 检测所有改动
 */
function detectChanges(config: GlobalConfig): DetectedChanges {
  const changes: DetectedChanges = {
    configFile: null,
    masterDir: null,
    symlinks: [],
    backups: [],
  }

  // 1. 检测配置文件
  const configPath = getConfigPath()
  if (fs.existsSync(configPath)) {
    changes.configFile = configPath
  }

  // 2. 检测 Master 目录
  if (config.masterDir && fs.existsSync(config.masterDir)) {
    const skillCount = countSkills(config.masterDir)
    changes.masterDir = {
      path: config.masterDir,
      skillCount,
    }
  }

  // 3. 检测符号链接和备份
  if (config.apps && Array.isArray(config.apps)) {
    for (const app of config.apps) {
      const skillsPath = app.skillsPath

      // 检测符号链接
      if (fs.existsSync(skillsPath)) {
        if (isSymlink(skillsPath)) {
          const target = getSymlinkTarget(skillsPath)
          // 只处理指向 masterDir 的链接
          if (target && config.masterDir) {
            const normalizedTarget = path.normalize(target)
            const normalizedMaster = path.normalize(config.masterDir)
            if (normalizedTarget === normalizedMaster) {
              changes.symlinks.push({
                app: app.name,
                path: skillsPath,
                target,
              })
            }
          }
        }
      }

      // 检测备份（自动检测所有 .backup* 文件）
      const parentDir = path.dirname(skillsPath)
      const baseName = path.basename(skillsPath)
      try {
        const entries = fs.readdirSync(parentDir)
        for (const entry of entries) {
          if (entry.startsWith(baseName + '.backup')) {
            changes.backups.push({
              app: app.name,
              backupPath: path.join(parentDir, entry),
              originalPath: skillsPath,
            })
          }
        }
      } catch {
        // 目录不存在或无权限，跳过
      }
    }
  }

  return changes
}

/**
 * 显示检测到的改动
 */
function displayChanges(changes: DetectedChanges) {
  logger.log(t('reset.detected'))
  logger.newline()

  if (changes.configFile) {
    logger.log(`  ${t('reset.configFile')}: ${changes.configFile}`)
  }

  if (changes.masterDir) {
    logger.log(
      `  ${t('reset.masterDir')}: ${changes.masterDir.path} (${changes.masterDir.skillCount} ${t('reset.skillCount')})`,
    )
  }

  if (changes.symlinks.length > 0) {
    logger.log(`  ${t('reset.symlinks')}:`)
    for (const link of changes.symlinks) {
      logger.log(`    ✓ ${link.app}: ${link.path} → ${path.basename(link.target)}`)
    }
  }

  if (changes.backups.length > 0) {
    logger.log(`  ${t('reset.backups')}:`)
    for (const backup of changes.backups) {
      logger.log(`    ✓ ${backup.app}: ${path.basename(backup.backupPath)}`)
    }
  }

  logger.newline()
  logger.log(t('reset.willExecute'))

  let step = 1
  for (const link of changes.symlinks) {
    logger.log(`  ${step}. ${t('reset.deleteSymlink')}: ${link.app}`)
    step++
  }

  for (const backup of changes.backups) {
    logger.log(
      `  ${step}. ${t('reset.restoreBackup')}: ${backup.app} (${path.basename(backup.backupPath)} → skills)`,
    )
    step++
  }

  if (changes.masterDir) {
    logger.log(`  ${step}. ${t('reset.deleteMasterDir')} (${changes.masterDir.skillCount} ${t('reset.skillCount')})`)
    step++
  }

  if (changes.configFile) {
    logger.log(`  ${step}. ${t('reset.deleteConfig')}`)
  }
}

/**
 * 执行重置
 */
function executeReset(changes: DetectedChanges) {
  // 1. 删除符号链接
  for (const link of changes.symlinks) {
    const result = removeSymlink(link.path)
    if (result.success) {
      logger.success(`${t('reset.deleteSymlink')}: ${link.app}`)
    } else {
      logger.error(`${t('reset.deleteFailed')}: ${link.app} - ${result.message}`)
    }
  }

  // 2. 恢复备份
  for (const backup of changes.backups) {
    try {
      // 如果原位置已存在，先删除
      if (fs.existsSync(backup.originalPath)) {
        fs.rmSync(backup.originalPath, { recursive: true, force: true })
      }
      // 重命名备份
      fs.renameSync(backup.backupPath, backup.originalPath)
      logger.success(`${t('reset.restoreBackup')}: ${backup.app}`)
    } catch (error) {
      logger.error(`${t('reset.restoreFailed')}: ${backup.app} - ${(error as Error).message}`)
    }
  }

  // 3. 删除 Master 目录
  if (changes.masterDir) {
    try {
      fs.rmSync(changes.masterDir.path, { recursive: true, force: true })
      logger.success(`${t('reset.deleteMasterDir')} (${changes.masterDir.skillCount} ${t('reset.skillCount')})`)
    } catch (error) {
      logger.error(`${t('reset.deleteFailed')}: ${(error as Error).message}`)
    }
  }

  // 4. 删除配置文件
  if (changes.configFile) {
    try {
      fs.rmSync(changes.configFile)
      logger.success(t('reset.deleteConfig'))
    } catch (error) {
      logger.error(`${t('reset.deleteFailed')}: ${(error as Error).message}`)
    }
  }
}

export default { runReset }
