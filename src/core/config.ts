/**
 * config.ts - 读写 config.yaml
 *
 * 提供 config.yaml 的读取、写入、验证、默认配置生成等功能
 */

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { logger } from './logger.js'
import { detectMasterDir, agentRegistry, resolveGlobalPath } from './path-detect.js'
import { t } from './i18n.js'

const JSON_SCHEMA = yaml.JSON_SCHEMA

const CONFIG_FILENAME = 'config.yaml'

/**
 * 应用配置接口
 */
export interface AppConfig {
  name: string
  skillsPath: string
  enabled?: boolean
}

/**
 * Git 配置接口
 */
export interface GitConfig {
  enabled: boolean
  remote: string
  autoPush?: boolean
}

/**
 * Watch 配置接口
 */
export interface WatchConfig {
  enabled: boolean
  debounceMs: number
}

/**
 * 全局配置接口
 */
export interface GlobalConfig {
  masterDir: string
  language?: string
  git: GitConfig
  watch: WatchConfig
  apps: AppConfig[]
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 默认启用的 agent ID 列表（setup 时自动写入 config）
 * 其他 agent 用户可手动添加或通过 link 命令启用
 */
const DEFAULT_ENABLED_AGENTS = ['claude', 'gemini-cli', 'codex']

/**
 * 获取默认配置
 * 从注册表自动生成，不再为每个 agent 硬编码路径
 */
export function getDefaultConfig(): GlobalConfig {
  const apps: AppConfig[] = Object.entries(agentRegistry).map(([id, def]) => ({
    name: def.displayName,
    skillsPath: resolveGlobalPath(def.globalPath),
    enabled: DEFAULT_ENABLED_AGENTS.includes(id),
  }))

  return {
    masterDir: detectMasterDir(),
    language: 'en',
    git: {
      enabled: false,
      remote: '',
      autoPush: true,
    },
    watch: {
      enabled: false,
      debounceMs: 3000,
    },
    apps,
  }
}

/**
 * 获取配置文件路径
 */
export function getConfigPath(cwd: string = process.cwd()): string {
  return path.join(cwd, CONFIG_FILENAME)
}

/**
 * 检查配置是否存在
 */
export function configExists(cwd: string = process.cwd()): boolean {
  return fs.existsSync(getConfigPath(cwd))
}

/**
 * 读取配置
 */
export function readConfig(cwd: string = process.cwd()): GlobalConfig | null {
  const configPath = getConfigPath(cwd)

  if (!fs.existsSync(configPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    return yaml.load(content, { schema: JSON_SCHEMA }) as GlobalConfig
  } catch (error) {
    logger.error(t('setup.readFailed', { error: (error as Error).message }))
    return null
  }
}

/**
 * 写入配置
 */
export function writeConfig(config: GlobalConfig, cwd: string = process.cwd()): boolean {
  const configPath = getConfigPath(cwd)

  try {
    const content = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
    })
    fs.writeFileSync(configPath, content, 'utf-8')
    return true
  } catch (error) {
    logger.error(t('setup.writeFailed', { error: (error as Error).message }))
    return false
  }
}

/**
 * 验证配置
 */
export function validateConfig(config: GlobalConfig | null): ConfigValidationResult {
  const errors: string[] = []

  if (!config) {
    errors.push('配置为空')
    return { valid: false, errors }
  }

  if (!config.masterDir) {
    errors.push('缺少 masterDir 配置')
  }

  if (!config.git || typeof config.git.enabled !== 'boolean') {
    errors.push('缺少 git.enabled 配置')
  }

  if (!config.watch || typeof config.watch.enabled !== 'boolean') {
    errors.push('缺少 watch.enabled 配置')
  }

  if (!config.apps || !Array.isArray(config.apps)) {
    errors.push('缺少 apps 配置')
  } else {
    config.apps.forEach((app, index) => {
      if (!app.name) {
        errors.push(`apps[${index}] 缺少 name`)
      }
      if (!app.skillsPath) {
        errors.push(`apps[${index}] 缺少 skillsPath`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 确保配置存在且有效
 */
export function ensureConfig(cwd: string = process.cwd()): { exists: boolean; config: GlobalConfig | null } {
  const config = readConfig(cwd)

  if (!config) {
    return { exists: false, config: null }
  }

  const { valid, errors } = validateConfig(config)

  if (!valid) {
    logger.error('配置文件格式有误:')
    errors.forEach((err) => logger.error(`  - ${err}`))
    return { exists: false, config: null }
  }

  return { exists: true, config }
}

/**
 * 获取已启用的应用
 */
export function getEnabledApps(config: GlobalConfig): AppConfig[] {
  if (!config || !config.apps) return []
  return config.apps.filter((app) => app.enabled !== false)
}

/**
 * 根据名称查找应用
 */
export function findAppByName(config: GlobalConfig, name: string): AppConfig | undefined {
  if (!config || !config.apps) return undefined
  return config.apps.find(
    (app) => app.name.toLowerCase() === name.toLowerCase(),
  )
}

/**
 * 添加应用
 */
export function addApp(config: GlobalConfig, app: AppConfig): GlobalConfig {
  const newConfig = { ...config }
  newConfig.apps = [...(newConfig.apps || []), app]
  return newConfig
}

/**
 * 更新应用
 */
export function updateApp(config: GlobalConfig, name: string, updates: Partial<AppConfig>): GlobalConfig {
  const newConfig = { ...config }
  newConfig.apps = newConfig.apps.map((app) =>
    app.name.toLowerCase() === name.toLowerCase()
      ? { ...app, ...updates }
      : app,
  )
  return newConfig
}

/**
 * 删除应用
 */
export function removeApp(config: GlobalConfig, name: string): GlobalConfig {
  const newConfig = { ...config }
  newConfig.apps = newConfig.apps.filter(
    (app) => app.name.toLowerCase() !== name.toLowerCase(),
  )
  return newConfig
}

export default {
  getDefaultConfig,
  getConfigPath,
  configExists,
  readConfig,
  writeConfig,
  validateConfig,
  ensureConfig,
  getEnabledApps,
  findAppByName,
  addApp,
  updateApp,
  removeApp,
}
