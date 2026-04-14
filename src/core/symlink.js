/**
 * symlink.js - 跨平台符号链接创建/验证
 *
 * Windows: 使用 Junction（目录级 symlink，无需管理员权限）
 * macOS/Linux: 使用原生 symlink（用户目录下无需 sudo）
 * 提供符号链接的创建、验证、检查等功能
 */

import { execSync, spawnSync } from 'child_process'
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
}

/**
 * 检测当前平台
 */
const isWindows = process.platform === 'win32'
const isMacOS = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

/**
 * 检查路径是否存在
 * @param {string} targetPath - 目标路径
 * @returns {boolean} 是否存在
 */
export function pathExists(targetPath) {
  return fs.existsSync(targetPath)
}

/**
 * 检查路径是否是符号链接（兼容旧名称）
 * @param {string} targetPath - 目标路径
 * @returns {boolean} 是否是符号链接
 */
export function isSymlink(targetPath) {
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
 * @param {string} targetPath - 目标路径
 * @returns {boolean} 是否是符号链接
 */
export const isJunction = isSymlink

/**
 * 获取符号链接的目标路径（跨平台）
 * @param {string} linkPath - 符号链接路径
 * @returns {string|null} 目标路径，不是符号链接则返回 null
 */
export function getSymlinkTarget(linkPath) {
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
 * @param {string} junctionPath - Junction 路径
 * @returns {string|null} 目标路径
 */
export const getJunctionTarget = getSymlinkTarget

/**
 * 检查应用链接状态
 * @param {Object} app - 应用配置对象
 * @param {string} masterDir - Master 目录路径
 * @returns {{ status: string, message: string }} 状态结果
 */
export function checkLinkStatus(app, masterDir) {
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
 * @param {string} script - PowerShell 脚本
 * @returns {{ success: boolean, stdout: string, stderr: string }} 结果
 */
function runPowerShell(script) {
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
      stderr: error.message,
    }
  }
}

/**
 * 创建符号链接（跨平台）
 * @param {string} target - 目标目录（masterDir）
 * @param {string} linkPath - 链接路径
 * @param {boolean} dryRun - 是否只打印不执行
 * @returns {{ success: boolean, message: string, backup?: string }} 结果
 */
export function createSymlink(target, linkPath, dryRun = false) {
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
    let backupPath = null
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
      message: `创建符号链接失败: ${error.message}`,
    }
  }
}

/**
 * 创建 Windows Junction（无需管理员权限）
 */
function createWindowsJunction(target, linkPath, backupPath) {
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
      backup: backupPath,
    }
  } catch (error) {
    return {
      success: false,
      message: `创建 Junction 失败: ${error.message}`,
    }
  }
}

/**
 * 创建 macOS/Linux 符号链接（用户目录下无需 sudo）
 */
function createUnixSymlink(target, linkPath, backupPath) {
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
      backup: backupPath,
    }
  } catch (error) {
    // 详细的错误处理
    let errorMessage = error.message
    let hint = ''

    if (error.code === 'EPERM') {
      errorMessage = '权限不足: 无法创建符号链接'
      hint = '用户目录下不应出现此问题，请检查文件系统权限'
    } else if (error.code === 'EACCES') {
      errorMessage = '访问被拒绝: 权限不足'
      hint = '请检查是否有写入权限'
    } else if (error.code === 'EEXIST') {
      errorMessage = '路径已存在且无法删除'
      hint = '请手动删除现有路径后重试'
    }

    return {
      success: false,
      message: errorMessage,
      hint,
      error: error.message,
    }
  }
}

/**
 * 创建 Junction 链接（别名，向后兼容）
 */
export const createJunction = createSymlink

/**
 * 转义 PowerShell 字符串
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapePowerShellString(str) {
  // 使用单引号包裹，内部单引号转义为两个单引号
  return "'" + str.replace(/'/g, "''") + "'"
}

/**
 * 删除符号链接（跨平台）
 * @param {string} linkPath - 链接路径
 * @param {boolean} dryRun - 是否只打印不执行
 * @returns {{ success: boolean, message: string }} 结果
 */
export function removeSymlink(linkPath, dryRun = false) {
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
      // Windows: 使用 PowerShell 删除 Junction
      const script = `Remove-Item ${escapePowerShellString(linkPath)} -Force`
      const result = runPowerShell(script)

      if (!result.success) {
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
      message: `删除失败: ${error.message}`,
    }
  }
}

/**
 * 删除 Junction 链接（别名，向后兼容）
 */
export const removeJunction = removeSymlink

/**
 * 批量检查所有应用的链接状态
 * @param {Object} config - 配置对象
 * @returns {Array} 各应用状态列表
 */
export function checkAllLinks(config) {
  const { masterDir, apps } = config
  return apps.map((app) => ({
    app,
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
