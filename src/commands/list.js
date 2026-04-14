/**
 * list.js - 列出用户自行下载的 skills 命令
 *
 * 扫描电脑上用户自行下载的 skills（非 AI 应用内置），显示列表
 */

import fs from 'fs'
import { logger } from '../core/logger.js'
import { scanSkills } from '../core/scanner.js'

/**
 * 运行 list 命令
 */
export async function runList() {
  logger.title('扫描用户自行下载的 Skills')
  logger.newline()

  // 扫描 skills
  const skills = await scanSkills()

  if (skills.length === 0) {
    logger.warn('未找到用户自行下载的 skills')
    logger.newline()
    logger.log('提示：Skills 是包含 SKILL.md 文件的目录')
    logger.log('      如果您的 skills 在非默认路径，请手动复制到 master 目录')
    return
  }

  // 显示找到的 skills
  logger.success(`找到 ${skills.length} 个用户自行下载的 skills：`)
  logger.newline()

  for (const skill of skills) {
    const padEnd = 20
    const name =
      skill.name.length > padEnd - 1
        ? skill.name.substring(0, padEnd - 2) + '..'
        : skill.name
    logger.log(
      `  ${logger.successText('✔')} ${name.padEnd(padEnd)} 来自 ${skill.sourceApp}`,
    )
    logger.log(`    ${logger.dim(skill.path)}`)
  }

  logger.newline()
  logger.hint('运行 skills-link import 导入这些 skills 到 master 目录')
}

export default { runList }
