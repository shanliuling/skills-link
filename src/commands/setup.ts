/**
 * setup.js - 初始化配置命令
 *
 * 引导用户完成初始化：创建 master 目录、生成 config.yaml、初始化 Git（可选）
 * 支持路径智能探测，减少用户手动输入
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import {
  getDefaultConfig,
  writeConfig,
  configExists,
  readConfig,
} from '../core/config.js'
import { initGit, addRemote } from '../core/git.js'
import { t, initI18n, getCurrentLocale } from '../core/i18n.js'
import {
  detectAllAppPaths,
  detectMasterDir,
  mergeWithExistingConfig,
} from '../core/path-detect.js'

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

  const existingConfig = readConfig()
  const detectedMasterDir = detectMasterDir()
  const detectedApps = detectAllAppPaths()
  const apps = mergeWithExistingConfig(
    detectedApps,
    existingConfig
      ? {
          apps: (existingConfig.apps || []).map((app) => ({
            ...app,
            exists: fs.existsSync(app.skillsPath),
          })),
        }
      : null,
  )

  // 只展示已检测到存在的 agent，其余折叠显示数量
  const visibleApps = apps.filter((a) => a.exists)
  const hiddenCount = apps.length - visibleApps.length

  logger.info(t('setup.detectedPaths'))
  logger.newline()
  logger.log(`  ${logger.successText('Master:')} ${detectedMasterDir}`)
  logger.newline()
  logger.log(`  ${logger.successText(t('setup.appsLabel'))}`)
  for (const app of visibleApps) {
    const statusIcon = app.exists
      ? logger.successText('✓')
      : logger.warnText('○')
    logger.log(`    ${statusIcon} ${app.name.padEnd(12)} ${app.skillsPath}`)
  }
  if (hiddenCount > 0) {
    logger.log(`    ${logger.dim(`... +${hiddenCount} more (run 'app list' to see all)`)}`)
  }
  logger.newline()

  const { pathsCorrect } = await inquirer.prompt([
    {
      type: 'list',
      name: 'pathsCorrect',
      message: t('setup.pathsCorrectPrompt'),
      choices: [
        { name: t('setup.pathsYes'), value: 'yes' },
        { name: t('setup.pathsEdit'), value: 'edit' },
      ],
      default: 'yes',
    },
  ])

  let finalMasterDir = detectedMasterDir
  let finalApps = apps

  if (pathsCorrect === 'edit') {
    logger.newline()
    logger.info(t('setup.editModeHint'))
    logger.newline()

    const masterAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'masterDir',
        message: t('setup.masterDirPrompt'),
        default: detectedMasterDir,
      },
    ])
    finalMasterDir = masterAnswer.masterDir

    // edit 模式下只编辑已检测到存在的 agent，避免逐个输入 41 个路径
    const editApps = finalApps.filter((a) => a.exists)
    for (const app of editApps) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'skillsPath',
          message: `${app.name} ${t('setup.pathPrompt')}`,
          default: app.skillsPath,
        },
      ])
      app.skillsPath = answer.skillsPath
      app.exists = fs.existsSync(answer.skillsPath)
    }
  }

  const gitAnswers = await inquirer.prompt([
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
    masterDir: finalMasterDir,
    language: language,
    git: {
      enabled: gitAnswers.enableGit,
      remote: gitAnswers.gitRemote || '',
      autoPush: true,
    },
    watch: {
      enabled: gitAnswers.enableWatch,
      debounceMs: gitAnswers.debounceMs || 3000,
    },
    apps: finalApps.map((app) => ({
      name: app.name,
      skillsPath: app.skillsPath || '',
      enabled: app.enabled !== false,
    })),
  }

  if (!fs.existsSync(config.masterDir)) {
    try {
      fs.mkdirSync(config.masterDir, { recursive: true })
      logger.success(t('setup.masterDirCreated', { path: config.masterDir }))
    } catch (error) {
      logger.error(t('setup.masterDirCreateFailed', { error: (error as Error).message }))
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
          logger.error(
            t('setup.gitRemoteFailed', { error: remoteResult.message }),
          )
        }
      }
    } else {
      logger.error(t('setup.gitInitFailed', { error: result.message }))
    }
  }

  const notExistApps = config.apps.filter(
    (app) => !fs.existsSync(app.skillsPath),
  )
  if (notExistApps.length > 0) {
    logger.newline()
    logger.warn(t('setup.somePathsNotExist'))
    for (const app of notExistApps) {
      logger.log(`  ${logger.warnText('○')} ${app.name}: ${app.skillsPath}`)
    }
    logger.hint(t('setup.pathNotFoundHint'))
  }

  logger.newline()
  logger.hint(t('setup.nextStepHint'))
}

export default { runSetup }
