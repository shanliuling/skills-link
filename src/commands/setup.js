/**
 * setup.js - 初始化配置命令
 *
 * 引导用户完成初始化：创建 master 目录、生成 config.yaml、初始化 Git（可选）
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { getDefaultConfig, writeConfig, configExists } from '../core/config.js'
import { initGit, addRemote } from '../core/git.js'
import { t, initI18n, getCurrentLocale } from '../core/i18n.js'

/**
 * 运行 setup 命令
 */
export async function runSetup() {
  logger.title(t('setup.title'))
  logger.newline()

  if (configExists()) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: t('setup.configExists'),
        default: false,
      },
    ])

    if (!overwrite) {
      logger.info(t('common.cancelled'))
      return
    }
  }

  const { language } = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: t('setup.languagePrompt'),
      choices: [
        { name: t('setup.languageZh'), value: 'zh' },
        { name: t('setup.languageEn'), value: 'en' },
      ],
      default: getCurrentLocale(),
    },
  ])

  initI18n(language)

  const defaultConfig = getDefaultConfig()
  const username = os.userInfo().username

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'masterDir',
      message: t('setup.masterDirPrompt'),
      default: defaultConfig.masterDir,
      validate: (input) => {
        if (!input.trim()) return t('setup.masterDirRequired')
        return true
      },
    },
    {
      type: 'confirm',
      name: 'enableGit',
      message: t('setup.enableGitPrompt'),
      default: false,
    },
    {
      type: 'input',
      name: 'gitRemote',
      message: t('setup.gitRemotePrompt'),
      when: (ans) => ans.enableGit,
      default: '',
    },
    {
      type: 'confirm',
      name: 'enableWatch',
      message: t('setup.enableWatchPrompt'),
      default: false,
    },
    {
      type: 'number',
      name: 'debounceMs',
      message: t('setup.debouncePrompt'),
      default: 3000,
      when: (ans) => ans.enableWatch,
    },
  ])

  const config = {
    masterDir: answers.masterDir,
    language: language,
    git: {
      enabled: answers.enableGit,
      remote: answers.gitRemote || '',
      autoPush: true,
    },
    watch: {
      enabled: answers.enableWatch,
      debounceMs: answers.debounceMs || 3000,
    },
    apps: defaultConfig.apps,
  }

  if (!fs.existsSync(config.masterDir)) {
    try {
      fs.mkdirSync(config.masterDir, { recursive: true })
      logger.success(t('setup.masterDirCreated', { path: config.masterDir }))
    } catch (error) {
      logger.error(t('setup.masterDirCreateFailed', { error: error.message }))
      return
    }
  } else {
    logger.success(t('setup.masterDirExists', { path: config.masterDir }))
  }

  if (writeConfig(config)) {
    logger.success(t('setup.configGenerated'))
  } else {
    logger.error(t('setup.configWriteFailed'))
    return
  }

  if (config.git.enabled) {
    const result = await initGit(config.masterDir)
    if (result.success) {
      logger.success(t('setup.gitInitSuccess'))

      if (config.git.remote) {
        const remoteResult = await addRemote(
          config.masterDir,
          config.git.remote,
        )
        if (remoteResult.success) {
          logger.success(t('setup.gitRemoteAdded'))
        } else {
          logger.error(t('setup.gitRemoteFailed', { error: remoteResult.message }))
        }
      }
    } else {
      logger.error(t('setup.gitInitFailed', { error: result.message }))
    }
  }

  logger.newline()
  logger.hint(t('setup.nextStepHint'))
}

export default { runSetup }
