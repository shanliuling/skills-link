/**
 * app.js - 应用管理命令
 *
 * 支持 app add/remove/enable/disable/list
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { t } from '../core/i18n.js'
import {
  ensureConfig,
  addApp,
  removeApp,
  updateApp,
  writeConfig,
  findAppByName,
} from '../core/config.js'
import { createJunction } from '../core/symlink.js'

/**
 * 运行 app 命令
 */
export async function runApp(subcommand: string = 'list', options: Record<string, any> = {}) {
  switch (subcommand) {
    case 'add':
      await runAppAdd(options)
      break
    case 'remove':
      await runAppRemove(options)
      break
    case 'enable':
      await runAppToggle(options.name, true)
      break
    case 'disable':
      await runAppToggle(options.name, false)
      break
    case 'list':
      await runAppList()
      break
    default:
      logger.error(t('app.unknownSubcommand', { subcommand }))
      logger.hint(t('app.subcommandHint'))
  }
}

/**
 * 添加新应用
 */
async function runAppAdd(options: Record<string, any> = {}) {
  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  if (!fs.existsSync(config.masterDir)) {
    logger.error(t('app.masterDirNotExist'))
    return
  }

  logger.title(t('app.addTitle'))
  logger.newline()

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: t('app.namePrompt'),
      validate: (input: string) => {
        if (!input.trim()) return t('app.nameRequired')
        if (findAppByName(config, input)) {
          return t('app.nameExists')
        }
        return true
      },
    },
    {
      type: 'input',
      name: 'skillsPath',
      message: t('app.pathPrompt'),
      validate: (input: string) => {
        if (!input.trim()) return t('app.pathRequired')
        return true
      },
    },
    {
      type: 'confirm',
      name: 'createLink',
      message: t('app.createLinkPrompt'),
      default: true,
    },
    {
      type: 'confirm',
      name: 'enabled',
      message: t('app.enabledPrompt'),
      default: true,
    },
  ])

  const newApp = {
    name: answers.name,
    skillsPath: answers.skillsPath,
    enabled: answers.enabled,
  }

  const newConfig = addApp(config, newApp)

  if (!writeConfig(newConfig)) {
    logger.error(t('app.saveFailed'))
    return
  }

  logger.success(t('app.addSuccess', { name: answers.name }))

  if (answers.createLink) {
    const parentDir = fs.existsSync(path.dirname(answers.skillsPath))
    if (!parentDir) {
      logger.warn(t('app.pathNotExist'))
      return
    }

    const result = createJunction(config.masterDir, answers.skillsPath, false)
    if (result.success) {
      logger.success(t('app.linkCreated'))
      if (result.backup) {
        logger.log(`  ${logger.dim(t('app.backupInfo', { path: result.backup }))}`)
      }
    } else {
      logger.error(result.message)
    }
  }
}

/**
 * 删除应用
 */
async function runAppRemove(options: { name?: string } = {}) {
  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  let appName = options.name

  if (!appName) {
    if (!config.apps || config.apps.length === 0) {
      logger.warn(t('app.noApps'))
      return
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: t('app.selectRemove'),
        choices: config.apps.map((app) => ({
          name: `${app.name} (${app.skillsPath})`,
          value: app.name,
        })),
      },
    ])
    appName = selected
  }

  const app = findAppByName(config, appName!)
  if (!app) {
    logger.error(t('app.appNotFound', { name: appName! }))
    return
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: t('app.removeConfirm', { name: app.name }),
      default: false,
    },
  ])

  if (!confirm) {
    logger.info(t('common.cancelled'))
    return
  }

  const newConfig = removeApp(config, app.name)

  if (!writeConfig(newConfig)) {
    logger.error(t('app.saveFailed'))
    return
  }

  logger.success(t('app.removeSuccess', { name: app.name }))
}

/**
 * 启用/禁用应用
 */
async function runAppToggle(name: string | undefined, enabled: boolean) {
  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  let appName = name

  if (!appName) {
    if (!config.apps || config.apps.length === 0) {
      logger.warn(t('app.noApps'))
      return
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: enabled ? t('app.selectEnable') : t('app.selectDisable'),
        choices: config.apps.map((app) => ({
          name: `${app.name} (${app.skillsPath})`,
          value: app.name,
        })),
      },
    ])
    appName = selected
  }

  const app = findAppByName(config, appName!)
  if (!app) {
    logger.error(t('app.appNotFound', { name: appName! }))
    return
  }

  const newConfig = updateApp(config, app.name, { enabled })

  if (!writeConfig(newConfig)) {
    logger.error(t('app.saveFailed'))
    return
  }

  logger.success(
    enabled
      ? t('app.enableSuccess', { name: app.name })
      : t('app.disableSuccess', { name: app.name }),
  )
}

/**
 * 列出所有应用
 */
async function runAppList() {
  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  logger.title(t('app.listTitle'))
  logger.newline()

  if (!config.apps || config.apps.length === 0) {
    logger.warn(t('app.noApps'))
    logger.hint(t('app.addHint'))
    return
  }

  for (const app of config.apps) {
    const status =
      app.enabled !== false ? logger.successText(t('app.enabled')) : logger.dim(t('app.disabled'))
    logger.log(`  ${app.name.padEnd(15)} ${status}`)
    logger.log(`    ${logger.dim(app.skillsPath)}`)
  }

  logger.newline()
  logger.log(t('app.totalCount', { count: config.apps.length }))
}

export default { runApp }
