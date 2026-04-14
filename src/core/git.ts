/**
 * git.ts - Git 操作封装
 *
 * 封装 simple-git 库，提供初始化、提交、推送、回滚等操作
 * 所有操作在 git.enabled: false 时应跳过
 */

import simpleGit from 'simple-git'
import { logger } from './logger.js'

/**
 * Git 操作结果接口
 */
export interface GitResult {
  success: boolean
  message: string
  hash?: string
}

/**
 * Git 状态检查结果
 */
export interface GitStatusResult {
  hasChanges: boolean
  files: string[]
}

/**
 * 创建 simple-git 实例
 */
export function createGit(repoPath: string) {
  return simpleGit.simpleGit(repoPath)
}

/**
 * 检查目录是否是 Git 仓库
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    const git = createGit(repoPath)
    await git.status()
    return true
  } catch {
    return false
  }
}

/**
 * 初始化 Git 仓库
 */
export async function initGit(repoPath: string): Promise<GitResult> {
  try {
    const git = createGit(repoPath)
    await git.init()
    return { success: true, message: 'Git 已初始化' }
  } catch (error) {
    return {
      success: false,
      message: `Git 初始化失败: ${(error as Error).message}`,
    }
  }
}

/**
 * 添加 Git 远端
 */
export async function addRemote(
  repoPath: string,
  remoteUrl: string,
): Promise<GitResult> {
  try {
    const git = createGit(repoPath)
    // 检查是否已有 origin
    const remotes = await git.getRemotes()
    if (remotes.find((r) => r.name === 'origin')) {
      await git.removeRemote('origin')
    }
    await git.addRemote('origin', remoteUrl)
    return { success: true, message: '远端已添加' }
  } catch (error) {
    return {
      success: false,
      message: `添加远端失败: ${(error as Error).message}`,
    }
  }
}

/**
 * 检查是否有未提交的变更
 */
export async function hasChanges(repoPath: string): Promise<GitStatusResult> {
  try {
    const git = createGit(repoPath)
    const status = await git.status()
    return {
      hasChanges: !status.isClean(),
      files: [...status.staged, ...status.modified, ...status.not_added],
    }
  } catch (error) {
    logger.error(`检查 Git 状态失败: ${(error as Error).message}`)
    return { hasChanges: false, files: [] }
  }
}

/**
 * 提交变更
 */
export async function commitChanges(
  repoPath: string,
  message: string,
): Promise<GitResult> {
  try {
    const git = createGit(repoPath)
    await git.add('.')
    const result = await git.commit(message)
    return {
      success: true,
      message: '提交成功',
      hash: result.commit,
    }
  } catch (error) {
    return { success: false, message: `提交失败: ${(error as Error).message}` }
  }
}

/**
 * 推送到远端
 */
export async function pushToRemote(repoPath: string): Promise<GitResult> {
  try {
    const git = createGit(repoPath)
    await git.push('origin', 'main', { '--set-upstream': null })
    return { success: true, message: '推送成功' }
  } catch (error) {
    return { success: false, message: `推送失败: ${(error as Error).message}` }
  }
}

/**
 * 从远端拉取
 */
export async function pullFromRemote(repoPath: string): Promise<GitResult> {
  try {
    const git = createGit(repoPath)
    await git.pull('origin', 'main')
    return { success: true, message: '拉取成功' }
  } catch (error) {
    return { success: false, message: `拉取失败: ${(error as Error).message}` }
  }
}

/**
 * 克隆仓库
 */
export async function cloneRepo(
  repoUrl: string,
  localPath: string,
): Promise<GitResult> {
  try {
    await simpleGit.simpleGit().clone(repoUrl, localPath)
    return { success: true, message: '克隆成功' }
  } catch (error) {
    return { success: false, message: `克隆失败: ${(error as Error).message}` }
  }
}

/**
 * 获取最后一次提交信息
 */
export async function getLastCommit(
  repoPath: string,
): Promise<{ hash: string; date: string; message: string } | null> {
  try {
    const git = createGit(repoPath)
    const log = await git.log(['-1'])
    if (log.latest) {
      return {
        hash: log.latest.hash,
        date: log.latest.date,
        message: log.latest.message,
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * 回滚到指定提交
 */
export async function rollbackToCommit(
  repoPath: string,
  commitHash: string,
): Promise<GitResult> {
  try {
    const git = createGit(repoPath)
    await git.reset(['--hard', commitHash])
    return { success: true, message: `已回滚到 ${commitHash}` }
  } catch (error) {
    return { success: false, message: `回滚失败: ${(error as Error).message}` }
  }
}

/**
 * 同步操作（commit + push）
 */
export async function sync(
  repoPath: string,
  message?: string,
): Promise<GitResult> {
  try {
    const commitResult = await commitChanges(repoPath, message || 'Auto sync')
    if (!commitResult.success) {
      return commitResult
    }

    const pushResult = await pushToRemote(repoPath)
    return pushResult
  } catch (error) {
    return { success: false, message: `同步失败: ${(error as Error).message}` }
  }
}

/**
 * 检查是否有远端
 */
export async function hasRemote(repoPath: string): Promise<boolean> {
  try {
    const git = createGit(repoPath)
    const remotes = await git.getRemotes()
    return remotes.length > 0
  } catch {
    return false
  }
}

/**
 * 获取最后同步时间
 */
export async function getLastSyncTime(
  repoPath: string,
): Promise<string | null> {
  try {
    const lastCommit = await getLastCommit(repoPath)
    return lastCommit?.date || null
  } catch {
    return null
  }
}

/**
 * 获取提交历史
 */
export async function getCommitHistory(
  repoPath: string,
  limit: number = 10,
): Promise<Array<{ hash: string; date: string; message: string }>> {
  try {
    const git = createGit(repoPath)
    const log = await git.log([`-${limit}`])
    return log.all.map((commit) => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
    }))
  } catch {
    return []
  }
}

export default {
  createGit,
  isGitRepo,
  initGit,
  addRemote,
  hasChanges,
  commitChanges,
  pushToRemote,
  pullFromRemote,
  cloneRepo,
  getLastCommit,
  rollbackToCommit,
  sync,
  hasRemote,
  getLastSyncTime,
  getCommitHistory,
}
