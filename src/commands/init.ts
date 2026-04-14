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
import { getSkillModTime } from '../core/utils.js'

/**
 * 运行 init 命令
 */
export async function runInit() {
  logger.title('Skills-Sync 一键初始化')
  logger.newline()

  // 1. 检查并创建配置
  if (configExists()) {
    logger.info('配置文件已存在，跳过 setup')
  } else {
    logger.info('创建配置文件...')
    const defaultConfig = getDefaultConfig()
    const detectedMasterDir = detectMasterDir()
    const detectedApps = detectAllAppPaths()
    const mergedApps = mergeWithExistingConfig(detectedApps, null)

    defaultConfig.masterDir = detectedMasterDir
    defaultConfig.apps = mergedApps.map((app) => ({
      name: app.name,
      skillsPath: app.skillsPath,
      enabled: app.enabled !== false,
    }))

    if (!writeConfig(defaultConfig)) {
      logger.error('写入配置文件失败')
      return
    }
    logger.success('config.yaml 已生成')
  }

  // 读取配置
  const { readConfig } = await import('../core/config.js')
  const config = readConfig()
  if (!config) {
    logger.error('读取配置失败')
    return
  }

  // 2. 创建 master 目录
  if (!fs.existsSync(config.masterDir)) {
    logger.info(`创建 master 目录: ${config.masterDir}`)
    fs.mkdirSync(config.masterDir, { recursive: true })
    logger.success('Master 目录已创建')
  }

  // 3. 初始化 Git
  if (config.git?.enabled) {
    logger.info('初始化 Git...')
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
  logger.info('扫描 skills...')
  const skills = await scanSkills({ searchPaths: getDefaultSearchPaths() })

  if (skills.length > 0) {
    // 按名称分组，选择最新版本
    const groups = {}
    for (const skill of skills) {
      if (!groups[skill.name]) {
        groups[skill.name] = []
      }
      groups[skill.name].push(skill)
    }

    // 选择最新版本
    const finalSkills = []
    for (const name of Object.keys(groups)) {
      const duplicates = groups[name]
      duplicates.sort(
        (a, b) => getSkillModTime(b.path).getTime() - getSkillModTime(a.path).getTime(),
      )
      finalSkills.push(duplicates[0])
    }

    logger.newline()
    logger.info(
      `找到 ${skills.length} 个 skills（去重后 ${finalSkills.length} 个）`,
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
      logger.success(`已导入 ${importCount} 个 skills`)
    }
  } else {
    logger.warn('未找到任何 skills')
  }

  logger.newline()

  // 5. 创建 Junction
  logger.info('创建符号链接...')
  const enabledApps = config.apps?.filter((app) => app.enabled !== false) || []

  let linkCount = 0
  for (const app of enabledApps) {
    const parentDir = path.dirname(app.skillsPath)
    if (!fs.existsSync(parentDir)) {
      logger.log(`  ${logger.dim('○')} ${app.name} 未安装，跳过`)
      continue
    }

    const result = createJunction(config.masterDir, app.skillsPath, false)
    if (result.success) {
      logger.success(`${app.name} → ${app.skillsPath}`)
      if (result.backup) {
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
  logger.success('初始化完成！')
  logger.hint('现在所有 AI 应用共享同一个 skills 目录')
}

export default { runInit }
