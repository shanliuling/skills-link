/**
 * init.js - 一键初始化命令
 *
 * 自动完成：setup → import → link，使用默认值，无需用户确认
 */

import fs from 'fs'
import path from 'path'
import { logger } from '../core/logger.js'
import { getDefaultConfig, writeConfig, configExists } from '../core/config.js'
import { initGit, addRemote } from '../core/git.js'
import {
  scanSkills,
  copySkill,
  getDefaultSearchPaths,
} from '../core/scanner.js'
import { createJunction } from '../core/symlink.js'
import {
  detectAllAppPaths,
  detectMasterDir,
  mergeWithExistingConfig,
} from '../core/path-detect.js'
import { getSkillModTime, groupAndDedupSkills } from '../core/utils.js'
import { t } from '../core/i18n.js'

/**
 * 运行 init 命令
 */
export async function runInit() {
  logger.title(t('init.title'))
  logger.newline()

  // 1. 检查并创建配置
  if (configExists()) {
    logger.info(t('init.configExistsSkip'))
  } else {
    logger.info(t('init.creatingConfig'))
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

    if (!writeConfig(defaultConfig)) {
      logger.error(t('init.writeFailed'))
      return
    }
    logger.success(t('init.configGenerated'))
  }

  // 读取配置
  const { readConfig } = await import('../core/config.js')
  const config = readConfig()
  if (!config) {
    logger.error(t('init.readFailed'))
    return
  }

  // 2. 创建 master 目录
  if (!fs.existsSync(config.masterDir)) {
    logger.info(t('init.masterDirInfo', { path: config.masterDir }))
    fs.mkdirSync(config.masterDir, { recursive: true })
    logger.success(t('init.masterDirCreated'))
  }

  // 3. 初始化 Git
  if (config.git?.enabled) {
    logger.info(t('init.initGit'))
    const result = await initGit(config.masterDir)
    if (result.success) {
      logger.success(result.message)
      if (config.git.remote) {
        const remoteResult = await addRemote(
          config.masterDir,
          config.git.remote,
        )
        if (remoteResult.success) {
          logger.success(remoteResult.message)
        }
      }
    }
  }

  logger.newline()

  // 4. 扫描并导入 skills
  logger.info(t('list.scanning'))
  const skills = await scanSkills({ searchPaths: getDefaultSearchPaths() })

  if (skills.length > 0) {
    const finalSkills = groupAndDedupSkills(skills)

    logger.newline()
    logger.info(
      t('init.skillsFound', { total: skills.length, unique: finalSkills.length }),
    )

    // 自动导入
    let importCount = 0
    for (const skill of finalSkills) {
      const destPath = path.join(config.masterDir, skill.name)
      if (fs.existsSync(destPath)) {
        // 已存在，自动覆盖（选择更新的）
        const destTime = getSkillModTime(destPath)
        const srcTime = getSkillModTime(skill.path)
        if (srcTime > destTime) {
          const result = copySkill(skill.path, config.masterDir, true)
          if (result.success) {
            importCount++
          }
        }
      } else {
        const result = copySkill(skill.path, config.masterDir, false)
        if (result.success) {
          importCount++
        }
      }
    }

    if (importCount > 0) {
      logger.success(t('init.imported', { count: importCount }))
    }
  } else {
    logger.warn(t('list.noSkillsFound'))
  }

  logger.newline()

  // 5. 创建 Junction
  logger.info(t('clone.creatingLinks'))
  const enabledApps = config.apps?.filter((app) => app.enabled !== false) || []

  let linkCount = 0
  for (const app of enabledApps) {
    const parentDir = path.dirname(app.skillsPath)
    if (!fs.existsSync(parentDir)) {
      logger.log(`  ${logger.dim('○')} ${t('start.appNotInstalled', { name: app.name })}`)
      continue
    }

    const result = createJunction(config.masterDir, app.skillsPath, false)
    if (result.success) {
      logger.success(t('link.linkSuccess', { name: app.name, path: app.skillsPath }))
      if (result.backup) {
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
  logger.success(t('init.allComplete'))
  logger.hint(t('init.shareHint'))
}

export default { runInit }
