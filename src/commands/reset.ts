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
import os from 'os'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { readConfig } from '../core/config.js'
import { isSymlink, getSymlinkTarget } from '../core/symlink.js'
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

  logger.title('重置 Skills-Link')
  logger.newline()

  // 1. 读取配置（从用户主目录）
  const home = os.homedir()
  const config = readConfig(home)

  if (!config) {
    logger.warn('未找到配置文件，可能已经重置过了')
    return
  }

  // 2. 检测所有改动
  logger.info('正在检测改动...')
  const changes = detectChanges(config)

  if (changes.symlinks.length === 0 && changes.backups.length === 0) {
    logger.warn('未检测到任何改动')
    logger.hint('可能已经重置过了，或者没有执行过初始化')
    return
  }

  logger.newline()

  // 3. 显示检测结果
  displayChanges(changes)

  // 4. 如果是 dry-run，只显示预览
  if (dryRun) {
    logger.newline()
    logger.info('预览模式 - 以上操作将会执行')
    logger.hint('移除 --dry-run 参数以实际执行')
    return
  }

  // 5. 确认执行
  logger.newline()
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '此操作将还原到初始状态，是否继续？',
      default: false,
    },
  ])

  if (!confirm) {
    logger.info(t('common.cancelled'))
    return
  }

  // 6. 执行重置
  logger.newline()
  logger.info('正在执行...')
  executeReset(changes)

  // 7. 完成
  logger.newline()
  logger.success('已还原到初始状态！')
  logger.hint('现在可以重新运行 skills-link 进行初始化')
}

/**
 * 检测所有改动
 */
function detectChanges(config: any): DetectedChanges {
  const home = os.homedir()
  const changes: DetectedChanges = {
    configFile: null,
    masterDir: null,
    symlinks: [],
    backups: [],
  }

  // 1. 检测配置文件（在用户主目录）
  const configPath = path.join(home, 'config.yaml')
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

      // 检测备份
      const backupPatterns = [
        skillsPath + '.backup',
        skillsPath + '.backup1',
        skillsPath + '.backup2',
        skillsPath + '.backup3',
      ]

      for (const backupPath of backupPatterns) {
        if (fs.existsSync(backupPath)) {
          changes.backups.push({
            app: app.name,
            backupPath,
            originalPath: skillsPath,
          })
          break // 只恢复第一个找到的备份
        }
      }
    }
  }

  return changes
}

/**
 * 显示检测到的改动
 */
function displayChanges(changes: DetectedChanges) {
  logger.log('检测到以下内容：')
  logger.newline()

  if (changes.configFile) {
    logger.log(`  配置文件：${changes.configFile}`)
  }

  if (changes.masterDir) {
    logger.log(
      `  Master 目录：${changes.masterDir.path} (${changes.masterDir.skillCount} 个 skills)`,
    )
  }

  if (changes.symlinks.length > 0) {
    logger.log('  符号链接：')
    for (const link of changes.symlinks) {
      logger.log(`    ✓ ${link.app}: ${link.path} → ${path.basename(link.target)}`)
    }
  }

  if (changes.backups.length > 0) {
    logger.log('  备份目录：')
    for (const backup of changes.backups) {
      logger.log(`    ✓ ${backup.app}: ${path.basename(backup.backupPath)}`)
    }
  }

  logger.newline()
  logger.log('将会执行：')

  let step = 1
  for (const link of changes.symlinks) {
    logger.log(`  ${step}. 删除符号链接: ${link.app}`)
    step++
  }

  for (const backup of changes.backups) {
    logger.log(
      `  ${step}. 恢复备份: ${backup.app} (${path.basename(backup.backupPath)} → skills)`,
    )
    step++
  }

  if (changes.masterDir) {
    logger.log(`  ${step}. 删除 AISkills 目录 (${changes.masterDir.skillCount} 个 skills)`)
    step++
  }

  if (changes.configFile) {
    logger.log(`  ${step}. 删除配置文件`)
  }
}

/**
 * 执行重置
 */
function executeReset(changes: DetectedChanges) {
  // 1. 删除符号链接
  for (const link of changes.symlinks) {
    try {
      fs.rmSync(link.path, { recursive: true, force: true })
      logger.success(`删除符号链接: ${link.app}`)
    } catch (error) {
      logger.error(`删除失败: ${link.app} - ${(error as Error).message}`)
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
      logger.success(`恢复备份: ${backup.app}`)
    } catch (error) {
      logger.error(`恢复失败: ${backup.app} - ${(error as Error).message}`)
    }
  }

  // 3. 删除 Master 目录
  if (changes.masterDir) {
    try {
      fs.rmSync(changes.masterDir.path, { recursive: true, force: true })
      logger.success(`删除 AISkills 目录 (${changes.masterDir.skillCount} 个 skills)`)
    } catch (error) {
      logger.error(`删除失败: ${(error as Error).message}`)
    }
  }

  // 4. 删除配置文件
  if (changes.configFile) {
    try {
      fs.rmSync(changes.configFile)
      logger.success('删除配置文件')
    } catch (error) {
      logger.error(`删除配置失败: ${(error as Error).message}`)
    }
  }
}

/**
 * 统计 skills 数量
 */
function countSkills(masterDir: string): number {
  try {
    const entries = fs.readdirSync(masterDir, { withFileTypes: true })
    return entries.filter((entry) => {
      if (!entry.isDirectory()) return false
      const skillFile = path.join(masterDir, entry.name, 'SKILL.md')
      return fs.existsSync(skillFile)
    }).length
  } catch {
    return 0
  }
}

export default { runReset }
