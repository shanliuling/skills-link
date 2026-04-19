/**
 * app.ts - 应用管理命令
 *
 * 交互式列表，空格切换启用/禁用，回车确认保存
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { t } from '../core/i18n.js'
import {
  ensureConfig,
  addApp,
  writeConfig,
  findAppByName,
} from '../core/config.js'
import { createJunction, removeSymlink, isSymlink } from '../core/symlink.js'

/**
 * 运行 app 命令
 */
export async function runApp() {
  const { exists, config } = ensureConfig()
  if (!exists || !config) return

  if (!config.apps || config.apps.length === 0) {
    logger.warn(t('app.noApps'))
    logger.hint(t('app.addHint'))
    return
  }

  logger.title(t('app.listTitle'))
  logger.newline()

  // 用 checkbox 展示列表，已启用的默认选中
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: t('app.togglePrompt'),
      choices: config.apps.map((app) => ({
        name: `${app.name.padEnd(15)} ${app.skillsPath}`,
        value: app.name,
        checked: app.enabled !== false,
      })),
    },
  ])

  // 计算变更
  const enabledNames = new Set(selected)
  const changes: string[] = []

  for (const app of config.apps) {
    const wasEnabled = app.enabled !== false
    const nowEnabled = enabledNames.has(app.name)

    if (wasEnabled !== nowEnabled) {
      app.enabled = nowEnabled
      changes.push(
        nowEnabled
          ? t('app.enableSuccess', { name: app.name })
          : t('app.disableSuccess', { name: app.name }),
      )
    }
  }

  if (changes.length === 0) {
    logger.info(t('common.cancelled'))
    return
  }

  // 保存
  if (!writeConfig(config)) {
    logger.error(t('app.saveFailed'))
    return
  }

  for (const change of changes) {
    logger.success(change)
  }

  // 处理链接变更
  for (const app of config.apps) {
    const nowEnabled = enabledNames.has(app.name)

    if (nowEnabled) {
      // 启用：创建链接
      const parentDir = path.dirname(app.skillsPath)
      if (fs.existsSync(parentDir) && !fs.existsSync(app.skillsPath)) {
        const result = createJunction(config.masterDir, app.skillsPath, false)
        if (result.success) {
          logger.success(t('app.linkCreated', { name: app.name }))
        }
      }
    } else {
      // 禁用：只删除 symlink，普通目录跳过
      if (isSymlink(app.skillsPath)) {
        const result = removeSymlink(app.skillsPath)
        if (result.success) {
          logger.success(t('app.linkRemoved', { name: app.name }))
        }
      }
    }
  }
}

export default { runApp }
