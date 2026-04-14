/**
 * import.js - 扫描并导入现有 skills 命令
 *
 * 扫描电脑上已有的 skills，让用户选择要导入的 skills，复制到 master 目录
 * 同名 skill 自动选择最新版本
 * 支持 -y 参数跳过所有确认
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { ensureConfig } from '../core/config.js'
import { scanSkills, copySkill } from '../core/scanner.js'
import { t } from '../core/i18n.js'
import { getSkillModTime } from '../core/utils.js'

function groupSkillsByName(skills: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {}
  for (const skill of skills) {
    if (!groups[skill.name]) {
      groups[skill.name] = []
    }
    groups[skill.name].push(skill)
  }
  return groups
}

function selectLatestSkill(skills: any[]): any {
  return skills.reduce((latest: any, current: any) => {
    const latestTime = getSkillModTime(latest.path).getTime()
    const currentTime = getSkillModTime(current.path).getTime()
    return currentTime > latestTime ? current : latest
  })
}

function formatTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function runImport(options: { yes?: boolean } = {}) {
  const { yes = false } = options

  const { exists, config } = ensureConfig()
  if (!exists) return

  if (!fs.existsSync(config.masterDir)) {
    if (yes) {
      fs.mkdirSync(config.masterDir, { recursive: true })
      logger.success(t('import.masterDirCreated', { path: config.masterDir }))
    } else {
      const { create } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'create',
          message: t('import.masterDirNotExist'),
          default: true,
        },
      ])
      if (create) {
        fs.mkdirSync(config.masterDir, { recursive: true })
        logger.success(t('import.masterDirCreated', { path: config.masterDir }))
      } else {
        return
      }
    }
  }

  logger.title(t('import.title'))
  logger.newline()

  const skills = await scanSkills()

  if (skills.length === 0) {
    logger.warn(t('import.noSkillsFound'))
    logger.hint(t('import.skillsHint'))
    return
  }

  const groups = groupSkillsByName(skills)
  const duplicateNames = Object.keys(groups).filter(
    (name) => groups[name].length > 1,
  )

  let finalSkills = []

  if (duplicateNames.length > 0 && !yes) {
    logger.warn(
      t('import.duplicateFound', { count: duplicateNames.length }),
    )
    logger.newline()

    for (const name of duplicateNames) {
      const duplicates = groups[name]
      duplicates.sort((a, b) => {
        const timeA = getSkillModTime(a.path).getTime()
        const timeB = getSkillModTime(b.path).getTime()
        return timeB - timeA
      })

      logger.log(`  ${logger.bold(name)}:`)
      duplicates.forEach((skill, index) => {
        const time = getSkillModTime(skill.path)
        const timeStr = formatTime(time)
        const latest = index === 0 ? logger.successText(t('import.latest')) : ''
        logger.log(
          `    ${index + 1}. ${logger.dim(skill.sourceApp)} - ${timeStr} ${latest}`,
        )
      })

      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: t('import.selectVersion', { name }),
          choices: duplicates.map((skill, index) => ({
            name: `${skill.sourceApp} - ${formatTime(getSkillModTime(skill.path))}${index === 0 ? ` ${t('import.latest')}` : ''}`,
            value: skill,
          })),
          default: 0,
        },
      ])

      finalSkills.push(choice)
      logger.newline()
    }
  } else {
    for (const name of Object.keys(groups)) {
      const duplicates = groups[name]
      duplicates.sort(
        (a, b) => getSkillModTime(b.path).getTime() - getSkillModTime(a.path).getTime(),
      )
      finalSkills.push(duplicates[0])
    }
  }

  const uniqueNames = Object.keys(groups).filter(
    (name) => groups[name].length === 1,
  )
  for (const name of uniqueNames) {
    if (!finalSkills.find((s) => s.name === name)) {
      finalSkills.push(groups[name][0])
    }
  }

  if (!yes) {
    logger.log(t('import.willImport'))
    logger.newline()

    finalSkills.forEach((skill) => {
      const padEnd = 15
      const name =
        skill.name.length > padEnd - 1
          ? skill.name.substring(0, padEnd - 2) + '..'
          : skill.name
      logger.log(
        `  ${logger.dim('✔')} ${name.padEnd(padEnd)} ${t('import.from')} ${skill.sourceApp}`,
      )
    })
    logger.newline()

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: t('import.confirmImport', { count: finalSkills.length }),
        default: true,
      },
    ])

    if (!confirm) {
      logger.info(t('common.cancelled'))
      return
    }
  }

  const existingSkills = []
  const newSkills = []

  for (const skill of finalSkills) {
    const destPath = path.join(config.masterDir, skill.name)
    if (fs.existsSync(destPath)) {
      existingSkills.push(skill)
    } else {
      newSkills.push(skill)
    }
  }

  let overwrite = false
  if (existingSkills.length > 0) {
    if (!yes) {
      logger.newline()
      logger.warn(t('import.existingSkillsFound', { count: existingSkills.length }))
      existingSkills.forEach((s) => {
        const masterSkill = path.join(config.masterDir, s.name)
        const masterTime = getSkillModTime(masterSkill)
        const importTime = getSkillModTime(s.path)
        const isNewer = importTime.getTime() > masterTime.getTime()
        logger.log(
          `  - ${s.name} ${isNewer ? logger.successText(t('import.importVersionNewer')) : logger.dim(t('import.masterVersionNewer'))}`,
        )
      })

      const { overwriteChoice } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwriteChoice',
          message: t('import.overwritePrompt'),
          default: true,
        },
      ])

      overwrite = overwriteChoice
    } else {
      overwrite = true
      finalSkills = finalSkills.filter((s) => {
        const destPath = path.join(config.masterDir, s.name)
        if (fs.existsSync(destPath)) {
          const destTime = getSkillModTime(destPath)
          const srcTime = getSkillModTime(s.path)
          return srcTime > destTime
        }
        return true
      })
    }

    if (!overwrite && !yes) {
      finalSkills = finalSkills.filter((s) => !existingSkills.includes(s))

      if (finalSkills.length === 0) {
        logger.info(t('import.noNewSkills'))
        return
      }
    }
  }

  logger.newline()
  logger.info(t('import.startImport'))

  let successCount = 0
  let failCount = 0

  for (const skill of finalSkills) {
    const isExisting = existingSkills.some((s) => s.name === skill.name)
    const result = copySkill(
      skill.path,
      config.masterDir,
      isExisting && overwrite,
    )

    if (result.success) {
      logger.success(t('import.importSuccess', { name: skill.name }))
      successCount++
    } else if (result.skipped) {
      logger.warn(t('import.importSkipped', { message: result.message }))
    } else {
      logger.error(t('import.importFailed', { name: skill.name, error: result.message }))
      failCount++
    }
  }

  logger.newline()
  if (successCount > 0) {
    logger.success(t('import.importResult', { count: successCount, path: config.masterDir }))
  }
  if (failCount > 0) {
    logger.error(t('import.importFailCount', { count: failCount }))
  }

  logger.newline()
  logger.hint(t('import.nextStepHint'))
}

export default { runImport }
