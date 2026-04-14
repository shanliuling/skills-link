/**
 * app.js - 应用管理命令
 *
 * 支持 app add 添加新应用，app list 列出所有应用
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import {
  ensureConfig,
  addApp,
  writeConfig,
  findAppByName,
} from '../core/config.js'
import { createJunction } from '../core/symlink.js'

/**
 * 运行 app 命令
 * @param {string} subcommand - 子命令 (add / list)
 * @param {Object} options - 命令选项
 */
export async function runApp(subcommand: string = 'list', options: Record<string, any> = {}) {
  switch (subcommand) {
    case 'add':
      await runAppAdd(options)
      break
    case 'list':
      await runAppList()
      break
    default:
      logger.error(`未知子命令: ${subcommand}`)
      logger.hint('使用 skills-sync app add 或 skills-sync app list')
  }
}

/**
 * 添加新应用
 */
async function runAppAdd(options: Record<string, any> = {}) {
  // 检查配置
  const { exists, config } = ensureConfig()
  if (!exists) return

  // 检查 master 目录
  if (!fs.existsSync(config.masterDir)) {
    logger.error('Master 目录不存在，请检查 config.yaml 中的 masterDir 路径')
    return
  }

  logger.title('添加新应用')
  logger.newline()

  // 询问应用信息
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '应用名称',
      validate: (input) => {
        if (!input.trim()) return '请输入应用名称'
        // 检查是否已存在
        if (findAppByName(config, input)) {
          return '应用名称已存在'
        }
        return true
      },
    },
    {
      type: 'input',
      name: 'skillsPath',
      message: 'Skills 路径',
      validate: (input) => {
        if (!input.trim()) return '请输入路径'
        return true
      },
    },
    {
      type: 'confirm',
      name: 'createLink',
      message: '立即创建 symlink？',
      default: true,
    },
    {
      type: 'confirm',
      name: 'enabled',
      message: '启用该应用？',
      default: true,
    },
  ])

  // 添加到配置
  const newApp = {
    name: answers.name,
    skillsPath: answers.skillsPath,
    enabled: answers.enabled,
  }

  const newConfig = addApp(config, newApp)

  // 保存配置
  if (!writeConfig(newConfig)) {
    logger.error('保存配置失败')
    return
  }

  logger.success(`已添加 ${answers.name} 到 config.yaml`)

  // 创建 symlink
  if (answers.createLink) {
    const parentDir = fs.existsSync(path.dirname(answers.skillsPath))
    if (!parentDir) {
      logger.warn('路径不存在，跳过 symlink 创建')
      return
    }

    const result = createJunction(config.masterDir, answers.skillsPath, false)
    if (result.success) {
      logger.success('Symlink 已创建')
      if (result.backup) {
        logger.log(`  ${logger.dim('已备份原目录: ' + result.backup)}`)
      }
    } else {
      logger.error(result.message)
    }
  }
}

/**
 * 列出所有应用
 */
async function runAppList() {
  // 检查配置
  const { exists, config } = ensureConfig()
  if (!exists) return

  logger.title('已配置应用')
  logger.newline()

  if (!config.apps || config.apps.length === 0) {
    logger.warn('没有配置任何应用')
    logger.hint('运行 skills-sync app add 添加应用')
    return
  }

  for (const app of config.apps) {
    const status =
      app.enabled !== false ? logger.successText('启用') : logger.dim('禁用')
    logger.log(`  ${app.name.padEnd(15)} ${status}`)
    logger.log(`    ${logger.dim(app.skillsPath)}`)
  }

  logger.newline()
  logger.log(`共 ${config.apps.length} 个应用`)
}

export default { runApp }
