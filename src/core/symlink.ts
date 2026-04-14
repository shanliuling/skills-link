/**
 * symlink.ts - 跨平台符号链接创建/验证
 *
 * Windows: 使用 Junction（目录级 symlink，无需管理员权限）
 * macOS/Linux: 使用原生 symlink（用户目录下无需 sudo）
 * 提供符号链接的创建、验证、检查等功能
 */

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { logger } from './logger.js'

/**
 * 链接状态枚举
 */
export const LinkStatus = {
  OK: 'ok',
  WRONG_TARGET: 'wrong-target',
  NOT_LINKED: 'not-linked',
  NOT_INSTALLED: 'not-installed',
  MISSING: 'missing',
} as const

export type LinkStatusType = typeof LinkStatus[keyof typeof LinkStatus]

/**
 * 链接检查结果
 */
export interface LinkCheckResult {
  status: LinkStatusType
  message: string
}

/**
 * 链接创建结果
 */
export interface LinkResult {
  success: boolean
  message: string
  backup?: string
  hint?: string
  error?: string
}

/**
 * 应用配置接口
 */
export interface AppConfig {
  name: string
  skillsPath: string
  enabled?: boolean
}

/**
 * 检测当前平台
 */
const isWindows = process.platform === 'win32'

/**
 * 检查路径是否存在
 */
export function pathExists(targetPath: string): boolean {
  return fs.existsSync(targetPath)
}

/**
 * 检查路径是否是符号链接（兼容旧名称）
 */
export function isSymlink(targetPath: string): boolean {
  if (!fs.existsSync(targetPath)) {
    return false
  }

  try {
    const stats = fs.lstatSync(targetPath)
    return stats.isSymbolicLink()
  } catch {
    return false
  }
}

/**
 * 检查路径是否是 Junction（别名，向后兼容）
 */
export const isJunction = isSymlink

/**
 * 获取符号链接的目标路径（跨平台）
 */
export function getSymlinkTarget(linkPath: string): string | null {
  if (!fs.existsSync(linkPath)) {
    return null
  }

  try {
    if (isWindows) {
      // Windows: 使用 PowerShell 获取 Junction 目标
      const script = `(Get-Item ${escapePowerShellString(linkPath)}).Target`
      const result = runPowerShell(script)
      return result.stdout || null
    } else {
      // macOS/Linux: 使用 Node.js 原生 API
      return fs.readlinkSync(linkPath)
    }
  } catch {
    return null
  }
}

/**
 * 获取 Junction 的目标路径（别名，向后兼容）
 */
export const getJunctionTarget = getSymlinkTarget

/**
 * 检查应用链接状态
 */
export function checkLinkStatus(app: AppConfig, masterDir: string): LinkCheckResult {
  const { skillsPath, name } = app
  const parentDir = path.dirname(skillsPath)

  // 检查父目录是否存在（判断应用是否安装）
  if (!fs.existsSync(parentDir)) {
    return {
      status: LinkStatus.NOT_INSTALLED,
      message: '应用未安装',
    }
  }

  // skills 路径不存在（应用已安装，但 skills 目录不存在，可以创建）
  if (!fs.existsSync(skillsPath)) {
    return {
      status: LinkStatus.NOT_LINKED,
      message: '未创建链接，可运行 link 命令创建',
    }
  }

  // 检查是否是符号链接
  if (!isSymlink(skillsPath)) {
    return {
      status: LinkStatus.NOT_LINKED,
      message: '路径存在但不是符号链接',
    }
  }

  // 检查符号链接目标是否正确
  const target = getSymlinkTarget(skillsPath)
  const normalizedTarget = target ? path.normalize(target) : null
  const normalizedMaster = path.normalize(masterDir)

  if (normalizedTarget !== normalizedMaster) {
    return {
      status: LinkStatus.WRONG_TARGET,
      message: `是符号链接但指向错误目录: ${target}`,
    }
  }

  return {
    status: LinkStatus.OK,
    message: '正常',
  }
}

/**
 * 安全执行 PowerShell 命令（参数化）
 */
function runPowerShell(script: string): { success: boolean; stdout: string; stderr: string } {
  try {
    const result = spawnSync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      {
        encoding: 'utf-8',
        shell: false,
      },
    )

    return {
      success: result.status === 0,
      stdout: result.stdout?.trim() || '',
      stderr: result.stderr?.trim() || '',
    }
  } catch (error) {
    return {
      success: false,
      stdout: '',
      stderr: (error as Error).message,
    }
  }
}

/**
 * 创建符号链接（跨平台）
 */
export function createSymlink(target: string, linkPath: string, dryRun: boolean = false): LinkResult {
  if (dryRun) {
    return {
      success: true,
      message: `[DRY-RUN] 将创建符号链接: ${linkPath} → ${target}`,
    }
  }

  // 确保目标目录存在
  if (!fs.existsSync(target)) {
    return {
      success: false,
      message: `目标目录不存在: ${target}`,
    }
  }

  try {
    // 先检查链接路径是否存在
    let backupPath: string | null = null
    if (fs.existsSync(linkPath)) {
      const stats = fs.lstatSync(linkPath)
      if (stats.isSymbolicLink()) {
        // 已是符号链接，删除
        fs.unlinkSync(linkPath)
      } else {
        // 普通目录，备份
        backupPath = `${linkPath}.backup`
        let counter = 1
        while (fs.existsSync(backupPath)) {
          backupPath = `${linkPath}.backup${counter}`
          counter++
        }
        fs.renameSync(linkPath, backupPath)
      }
    }

    // 根据平台创建符号链接
    if (isWindows) {
      // Windows: 使用 PowerShell 创建 Junction（无需管理员权限）
      return createWindowsJunction(target, linkPath, backupPath)
    } else {
      // macOS/Linux: 使用 Node.js 原生 symlink
      return createUnixSymlink(target, linkPath, backupPath)
    }
  } catch (error) {
    return {
      success: false,
      message: `创建符号链接失败: ${(error as Error).message}`,
    }
  }
}

/**
 * 创建 Windows Junction（无需管理员权限）
 */
function createWindowsJunction(target: string, linkPath: string, backupPath: string | null): LinkResult {
  try {
    const script = `New-Item -ItemType Junction -Path ${escapePowerShellString(linkPath)} -Target ${escapePowerShellString(target)}`
    const result = runPowerShell(script)

    if (!result.success) {
      return {
        success: false,
        message: `创建 Junction 失败: ${result.stderr || '未知错误'}`,
      }
    }

    return {
      success: true,
      message: 'Junction 创建成功',
      backup: backupPath || undefined,
    }
  } catch (error) {
    return {
      success: false,
      message: `创建 Junction 失败: ${(error as Error).message}`,
    }
  }
}

/**
 * 创建 macOS/Linux 符号链接（用户目录下无需 sudo）
 */
function createUnixSymlink(target: string, linkPath: string, backupPath: string | null): LinkResult {
  try {
    // 检查父目录是否可写
    const parentDir = path.dirname(linkPath)
    try {
      fs.accessSync(parentDir, fs.constants.W_OK)
    } catch (error) {
      return {
        success: false,
        message: `父目录无写入权限: ${parentDir}`,
        hint: '请检查目录权限或确认应用已正确安装',
      }
    }

    // 创建符号链接
    fs.symlinkSync(target, linkPath, 'dir')

    return {
      success: true,
      message: '符号链接创建成功',
      backup: backupPath || undefined,
    }
  } catch (error) {
    // 详细的错误处理
    let errorMessage = (error as Error).message
    let hint = ''

    const errorCode = (error as NodeJS.ErrnoException).code
    if (errorCode === 'EPERM') {
      errorMessage = '权限不足: 无法创建符号链接'
      hint = '用户目录下不应出现此问题，请检查文件系统权限'
    } else if (errorCode === 'EACCES') {
      errorMessage = '访问被拒绝: 权限不足'
      hint = '请检查是否有写入权限'
    } else if (errorCode === 'EEXIST') {
      errorMessage = '路径已存在且无法删除'
      hint = '请手动删除现有路径后重试'
    }

    return {
      success: false,
      message: errorMessage,
      hint,
      error: (error as Error).message,
    }
  }
}

/**
 * 创建 Junction 链接（别名，向后兼容）
 */
export const createJunction = createSymlink

/**
 * 转义 PowerShell 字符串
 */
function escapePowerShellString(str: string): string {
  // 使用单引号包裹，内部单引号转义为两个单引号
  return "'" + str.replace(/'/g, "''") + "'"
}

/**
 * 删除符号链接（跨平台）
 */
export function removeSymlink(linkPath: string, dryRun: boolean = false): LinkResult {
  if (dryRun) {
    return {
      success: true,
      message: `[DRY-RUN] 将删除符号链接: ${linkPath}`,
    }
  }

  if (!fs.existsSync(linkPath)) {
    return {
      success: false,
      message: '路径不存在',
    }
  }

  if (!isSymlink(linkPath)) {
    return {
      success: false,
      message: '路径不是符号链接，无法删除',
    }
  }

  try {
    if (isWindows) {
      // Windows: 使用 cmd 删除 Junction（比 PowerShell 更可靠）
      const absoluteLinkPath = path.resolve(linkPath)
      const result = spawnSync('cmd', ['/c', 'rmdir', absoluteLinkPath], {
        encoding: 'utf-8',
      })

      if (result.status !== 0) {
        return {
          success: false,
          message: `删除失败: ${result.stderr || '未知错误'}`,
        }
      }

      return {
        success: true,
        message: '符号链接已删除',
      }
    } else {
      // macOS/Linux: 使用 fs.unlinkSync
      fs.unlinkSync(linkPath)
      return {
        success: true,
        message: '符号链接已删除',
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `删除失败: ${(error as Error).message}`,
    }
  }
}

/**
 * 删除 Junction 链接（别名，向后兼容）
 */
export const removeJunction = removeSymlink

/**
 * 批量检查所有应用的链接状态
 */
export function checkAllLinks(config: { masterDir: string; apps: AppConfig[] }): Array<AppConfig & LinkCheckResult> {
  const { masterDir, apps } = config
  return apps.map((app) => ({
    ...app,
    ...checkLinkStatus(app, masterDir),
  }))
}

export default {
  LinkStatus,
  pathExists,
  isSymlink,
  isJunction,
  getSymlinkTarget,
  getJunctionTarget,
  checkLinkStatus,
  createSymlink,
  createJunction,
  removeSymlink,
  removeJunction,
  checkAllLinks,
}
