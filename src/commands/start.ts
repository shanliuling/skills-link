/**
 * start.js - 自动引导命令
 *
 * 用户运行 skills-link 无参数时自动执行
 * 根据当前环境自动判断并执行正确的流程
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
import { cloneRepo, isGitRepo, initGit, addRemote } from '../core/git.js'
import {
  scanSkills,
  copySkill,
  getDefaultSearchPaths,
  countSkills,
} from '../core/scanner.js'
import { createJunction, checkAllLinks, LinkStatus } from '../core/symlink.js'
import { t, initI18n, getCurrentLocale } from '../core/i18n.js'
import {
  detectAllAppPaths,
  detectMasterDir,
  mergeWithExistingConfig,
} from '../core/path-detect.js'
import { getSkillModTime } from '../core/utils.js'

export async function runStart() {
  logger.title(t('start.title'))
  logger.newline()

  if (configExists()) {
    const config = readConfig()

    if (!config || !config.masterDir) {
      logger.error(t('start.configDamaged'))
      return
    }

    if (config.language) {
      initI18n(config.language)
    }

    if (fs.existsSync(config.masterDir) && countSkills(config.masterDir) > 0) {
      await showStatus(config)
      return
    }
  }

  await firstTimeSetup()
}

async function firstTimeSetup() {
  logger.log(t('start.welcome'))
  logger.newline()

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

  const detectedMasterDir = detectMasterDir()
  const detectedApps = detectAllAppPaths()
  const apps = mergeWithExistingConfig(detectedApps, null)

  logger.info(t('setup.detectedPaths'))
  logger.newline()
  logger.log(`  ${logger.successText('Master:')} ${detectedMasterDir}`)
  logger.newline()
  logger.log(`  ${logger.successText(t('setup.appsLabel'))}`)
  for (const app of apps) {
    const statusIcon = app.exists
      ? logger.successText('✓')
      : logger.warnText('○')
    logger.log(`    ${statusIcon} ${app.name.padEnd(12)} ${app.skillsPath}`)
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

    for (const app of finalApps) {
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

  const { hasGithub } = await inquirer.prompt([
    {
      type: 'list',
      name: 'hasGithub',
      message: t('start.hasGithubPrompt'),
      choices: [
        { name: t('start.hasGithubYes'), value: 'yes' },
        { name: t('start.hasGithubNo'), value: 'no' },
      ],
      default: 'no',
    },
  ])

  let githubUrl = null

  if (hasGithub === 'yes') {
    const { url } = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: t('start.githubUrlPrompt'),
        validate: (input) => {
          if (!input) return t('start.githubUrlRequired')
          if (!input.includes('github.com')) return t('start.githubUrlInvalid')
          return true
        },
      },
    ])
    githubUrl = url
  }

  const config = {
    masterDir: finalMasterDir,
    language: language,
    git: {
      enabled: !!githubUrl,
      remote: githubUrl || '',
      autoPush: !!githubUrl,
    },
    watch: {
      enabled: false,
      debounceMs: 3000,
    },
    apps: finalApps.map((app) => ({
      name: app.name,
      skillsPath: app.skillsPath,
      enabled: app.enabled !== false,
    })),
  }

  writeConfig(config)
  logger.success(t('start.configCreated'))
  logger.newline()

  const masterDir = config.masterDir

  if (githubUrl) {
    await setupWithGithub(masterDir, githubUrl, config)
  } else {
    await setupWithoutGithub(masterDir, config)
  }
}

async function setupWithGithub(masterDir, githubUrl, config) {
  if (fs.existsSync(masterDir)) {
    const entries = fs.readdirSync(masterDir)
    if (entries.length > 0) {
      logger.warn(t('start.dirExistsNotEmpty', { path: masterDir }))
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: t('start.howToHandle'),
          choices: [
            { name: t('start.deleteAndClone'), value: 'delete' },
            { name: t('start.keepAndSkip'), value: 'keep' },
          ],
          default: 'keep',
        },
      ])

      if (action === 'delete') {
        fs.rmSync(masterDir, { recursive: true, force: true })
      } else {
        await createLinks(config)
        showComplete(masterDir, true)
        return
      }
    }
  }

  logger.info(t('start.cloning'))
  const result = await cloneRepo(githubUrl, masterDir)

  if (!result.success) {
    logger.error(t('start.cloneFailed', { error: result.message }))
    logger.hint(t('start.cloneFailedHint'))
    return
  }

  logger.success(t('start.cloneSuccess'))
  const skillCount = countSkills(masterDir)
  logger.log(t('start.skillsFound', { count: skillCount }))
  logger.newline()

  await scanAndMergeLocalSkills(masterDir, config)
  await createLinks(config)
  showComplete(masterDir, true)
}

async function setupWithoutGithub(masterDir, config) {
  if (!fs.existsSync(masterDir)) {
    fs.mkdirSync(masterDir, { recursive: true })
  }

  logger.info(t('start.scanningLocal'))
  const skills = await scanSkills({ searchPaths: getDefaultSearchPaths() })

  if (skills.length === 0) {
    logger.warn(t('start.noSkillsFound'))
    logger.hint(t('start.noSkillsHint'))
    logger.hint(t('start.noSkillsHint2'))

    await createLinks(config)
    return
  }

  const groups = {}
  for (const skill of skills) {
    if (!groups[skill.name]) {
      groups[skill.name] = []
    }
    groups[skill.name].push(skill)
  }

  const finalSkills = []
  for (const name of Object.keys(groups)) {
    const duplicates = groups[name]
    duplicates.sort((a, b) => getSkillModTime(b.path).getTime() - getSkillModTime(a.path).getTime())
    finalSkills.push(duplicates[0])
  }

  logger.log(
    t('start.skillsCount', {
      total: skills.length,
      unique: finalSkills.length,
    }),
  )

  logger.newline()
  logger.info(t('start.importing'))

  let importCount = 0
  for (const skill of finalSkills) {
    const result = copySkill(skill.path, masterDir, false)
    if (result.success) {
      logger.success(t('start.skillImported', { name: skill.name }))
      importCount++
    }
  }

  logger.success(t('start.importComplete', { count: importCount }))
  logger.newline()

  await createLinks(config)
  showComplete(masterDir, false)
}

async function scanAndMergeLocalSkills(masterDir, config) {
  logger.info(t('start.scanningLocal'))
  const skills = await scanSkills({ searchPaths: getDefaultSearchPaths() })

  if (skills.length === 0) {
    return
  }

  const existingNames = new Set(
    fs
      .readdirSync(masterDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name),
  )

  const newSkills = skills.filter((s) => !existingNames.has(s.name))

  if (newSkills.length === 0) {
    return
  }

  const groups = {}
  for (const skill of newSkills) {
    if (!groups[skill.name]) {
      groups[skill.name] = []
    }
    groups[skill.name].push(skill)
  }

  const finalSkills = []
  for (const name of Object.keys(groups)) {
    const duplicates = groups[name]
    duplicates.sort((a, b) => getSkillModTime(b.path).getTime() - getSkillModTime(a.path).getTime())
    finalSkills.push(duplicates[0])
  }

  logger.log(t('start.localSkillsFound', { count: finalSkills.length }))

  const { shouldMerge } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldMerge',
      message: t('start.mergePrompt'),
      default: true,
    },
  ])

  if (!shouldMerge) {
    return
  }

  let importCount = 0
  for (const skill of finalSkills) {
    const result = copySkill(skill.path, masterDir, false)
    if (result.success) {
      importCount++
    }
  }

  if (importCount > 0) {
    logger.success(t('start.skillsMerged', { count: importCount }))
  }
}

async function createLinks(config) {
  logger.info(t('start.creatingLinks'))

  const enabledApps = config.apps?.filter((app) => app.enabled !== false) || []
  let linkCount = 0

  for (const app of enabledApps) {
    const parentDir = path.dirname(app.skillsPath)
    if (!fs.existsSync(parentDir)) {
      logger.log(
        `  ${logger.dim('○')} ${t('start.appNotInstalled', { name: app.name })}`,
      )
      continue
    }

    const result = createJunction(config.masterDir, app.skillsPath, false)
    if (result.success) {
      logger.success(t('start.appLinked', { name: app.name }))
      linkCount++
    } else {
      logger.error(t('start.appLinkFailed', { name: app.name }))
    }
  }

  if (linkCount > 0) {
    logger.success(t('start.linksCreated', { count: linkCount }))
  }

  logger.newline()
}

async function showStatus(config) {
  let hasChanges = false

  logger.info(t('start.detectingNew'))
  const newSkillsCount = await autoImportNewSkills(config)
  if (newSkillsCount > 0) {
    hasChanges = true
  }

  if (hasChanges && config.git?.enabled && config.git?.remote) {
    logger.newline()
    logger.info(t('start.syncingToGithub'))
    await autoSync(config)
  }

  logger.newline()
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━')
  logger.log(t('start.statusTitle'))
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━')

  const skillCount = countSkills(config.masterDir)
  logger.log(
    t('start.masterDirInfo', { path: config.masterDir, count: skillCount }),
  )

  if (config.git?.enabled) {
    logger.log(t('start.gitSyncEnabled', { remote: config.git.remote || '' }))
  } else {
    logger.log(t('start.gitSyncDisabled'))
  }

  logger.newline()

  logger.log(t('start.linkStatus'))
  const linkStatuses = checkAllLinks(config)

  let problemCount = 0

  for (const item of linkStatuses) {
    const { status } = item
    if (status === LinkStatus.OK) {
      logger.success(t('start.appLinkedOk', { name: item.name }))
    } else if (status === LinkStatus.NOT_INSTALLED) {
      logger.log(
        `  ${logger.dim('○')} ${t('start.appNotInstalledStatus', { name: item.name })}`,
      )
    } else {
      logger.warn(t('start.appNeedsFix', { name: item.name }))
      problemCount++
    }
  }

  logger.newline()

  if (problemCount > 0) {
    logger.warn(t('start.appsNeedFix', { count: problemCount }))
    logger.hint(t('start.fixLinkHint'))
  }
}

async function autoImportNewSkills(config) {
  const masterDir = config.masterDir

  const skills = await scanSkills({ searchPaths: getDefaultSearchPaths() })

  if (skills.length === 0) {
    return 0
  }

  const existingNames = new Set(
    fs
      .readdirSync(masterDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name),
  )

  const newSkills = skills.filter((s) => !existingNames.has(s.name))

  if (newSkills.length === 0) {
    return 0
  }

  const groups = {}
  for (const skill of newSkills) {
    if (!groups[skill.name]) {
      groups[skill.name] = []
    }
    groups[skill.name].push(skill)
  }

  const finalSkills = []
  for (const name of Object.keys(groups)) {
    const duplicates = groups[name]
    duplicates.sort((a, b) => getSkillModTime(b.path).getTime() - getSkillModTime(a.path).getTime())
    finalSkills.push(duplicates[0])
  }

  let importCount = 0
  for (const skill of finalSkills) {
    const result = copySkill(skill.path, masterDir, false)
    if (result.success) {
      logger.success(t('start.skillImported', { name: skill.name }))
      importCount++
    }
  }

  if (importCount > 0) {
    logger.success(t('start.newSkillsImported', { count: importCount }))
  }

  return importCount
}

async function autoSync(config) {
  try {
    const { commitChanges, pushToRemote } = await import('../core/git.js')

    const masterDir = config.masterDir

    const timestamp = new Date()
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19)
    const commitResult = await commitChanges(masterDir, `sync: ${timestamp}`)

    if (!commitResult.success) {
      if (commitResult.message.includes('没有需要同步')) {
        return
      }
      logger.error(t('start.syncFailed', { error: commitResult.message }))
      return
    }

    const pushResult = await pushToRemote(masterDir)

    if (pushResult.success) {
      logger.success(t('start.syncedToGithub'))
    } else {
      logger.error(t('start.syncFailed', { error: pushResult.message }))
    }
  } catch (error) {
    logger.error(t('start.syncFailed', { error: error.message }))
  }
}

function showComplete(masterDir, hasGit) {
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━')
  logger.success(t('start.setupComplete'))
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━')

  const skillCount = countSkills(masterDir)
  logger.log(t('start.masterDirInfo', { path: masterDir, count: skillCount }))
  logger.log(
    `Git ${t('common.done')}: ${hasGit ? t('common.yes') : t('common.no')}`,
  )

  logger.newline()

  if (hasGit) {
    logger.hint(t('start.syncHint'))
  } else {
    logger.hint(t('start.configGitHint'))
  }
}

export default { runStart }
