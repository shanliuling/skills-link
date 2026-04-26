/**
 * add.ts - 从 GitHub 安装 skills
 *
 * 支持两种格式：
 * 1. GitHub URL: https://github.com/user/repo
 * 2. shorthand: user/repo
 *
 * 使用方式：
 *   skills-link add user/repo                    # 列出所有 skill 供选择
 *   skills-link add user/repo -s my-skill       # 直接安装指定的 skill
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { simpleGit } from 'simple-git'
import inquirer from 'inquirer'
import { logger } from '../core/logger.js'
import { readConfig } from '../core/config.js'
import { listSkills } from '../core/scanner.js'
import { t } from '../core/i18n.js'

export interface AddOptions {
  skill?: string  // 指定要安装的 skill 名称
}

export async function runAdd(args: string[], options: AddOptions = {}) {
  const config = readConfig()
  if (!config) {
    logger.error(t('add.noConfig'))
    logger.hint(t('add.runSetupFirst'))
    return
  }

  const masterDir = config.masterDir

  if (!fs.existsSync(masterDir)) {
    logger.error(t('add.masterDirNotExist'))
    return
  }

  // 解析输入
  if (args.length === 0) {
    logger.error(t('add.usage'))
    logger.log(t('add.usageExample'))
    return
  }

  const input = args[0]
  const repoUrl = parseRepoUrl(input)

  if (!repoUrl) {
    logger.error(t('add.invalidUrl'))
    return
  }

  logger.info(t('add.cloning', { url: repoUrl }))

  // 创建临时目录
  const tempDir = path.join(os.tmpdir(), `skills-link-add-${process.pid}-${Date.now()}`)

  try {
    // 克隆仓库
    const git = simpleGit()
    await git.clone(repoUrl, tempDir, ['--depth', '1'])

    // 查找 SKILL.md 文件
    const skillDirs = await findSkillDirs(tempDir)

    if (skillDirs.length === 0) {
      logger.error(t('add.noSkillFound'))
      fs.rmSync(tempDir, { recursive: true, force: true })
      return
    }

    // 确定要安装的 skill
    let targetDir: string
    let skillName: string

    // 如果指定了 --skill 参数，直接使用
    if (options.skill) {
      const found = skillDirs.find((dir) => {
        const name = path.basename(dir)
        return name === options.skill
      })

      if (!found) {
        logger.error(t('add.skillNotFound', { name: options.skill }))
        logger.log(t('add.availableSkills'))
        for (const dir of skillDirs) {
          logger.log(`  - ${path.basename(dir)}`)
        }
        fs.rmSync(tempDir, { recursive: true, force: true })
        return
      }

      targetDir = found
      skillName = options.skill
    } else if (skillDirs.length === 1) {
      // 只有一个，直接使用
      targetDir = skillDirs[0]
      skillName = path.basename(targetDir)
    } else {
      // 多个 skill，让用户选择
      const choices = skillDirs.map((dir) => {
        const name = path.basename(dir)
        return { name, value: dir }
      })
      const { selected } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selected',
          message: t('add.selectSkill'),
          choices,
        },
      ])
      targetDir = selected
      skillName = path.basename(targetDir)
    }

    // 检查是否已存在
    const existingSkills = listSkills(masterDir)
    const exists = existingSkills.some((s) => s.name === skillName)

    if (exists) {
      logger.warn(t('add.skillExists', { name: skillName }))
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: t('add.overwritePrompt'),
          default: false,
        },
      ])
      if (!overwrite) {
        logger.info(t('common.cancelled'))
        fs.rmSync(tempDir, { recursive: true, force: true })
        return
      }
    }

    // 复制到 masterDir（使用 copy 避免跨设备问题）
    const destDir = path.join(masterDir, skillName)
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true })
    }
    copyDirRecursive(targetDir, destDir)

    logger.success(t('add.installed', { name: skillName }))

    logger.success(t('add.done'))
  } finally {
    // 确保清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }
}

/**
 * 解析输入为 Git URL
 */
function parseRepoUrl(input: string): string | null {
  // HTTPS/HTTP URL
  if (input.startsWith('https://') || input.startsWith('http://')) {
    try {
      const url = new URL(input)
      if (url.hostname === 'github.com') {
        let normalized = input.replace(/\.git$/, '').replace(/\/+$/, '')
        return normalized
      }
    } catch {
      return null
    }
    return null
  }

  // SSH URL (git@github.com:user/repo)
  if (input.startsWith('git@github.com:')) {
    const match = input.match(/^git@github\.com:(.+)$/)
    if (match) {
      return `https://github.com/${match[1].replace(/\.git$/, '')}`
    }
    return null
  }

  // user/repo 格式
  if (/^[\w.-]+\/[\w.-]+$/.test(input)) {
    return `https://github.com/${input}`
  }

  return null
}

/**
 * 递归复制目录
 */
function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * 递归查找包含 SKILL.md 的目录
 */
async function findSkillDirs(dir: string): Promise<string[]> {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      // 检查是否包含 SKILL.md
      const skillFile = path.join(fullPath, 'SKILL.md')
      if (fs.existsSync(skillFile)) {
        results.push(fullPath)
      } else {
        // 递归搜索子目录
        const subDirs = await findSkillDirs(fullPath)
        results.push(...subDirs)
      }
    }
  }

  return results
}

export default { runAdd }
