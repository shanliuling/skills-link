/**
 * config.js - 读写 config.yaml
 *
 * 提供 config.yaml 的读取、写入、验证、默认配置生成等功能
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import yaml from 'js-yaml'
import { logger } from './logger.js'

const CONFIG_FILENAME = 'config.yaml'

export function getDefaultConfig() {
  const homeDir = os.homedir()
  const platform = process.platform

  // 根据平台生成 Claude 默认路径
  let claudePath
  if (platform === 'win32') {
    claudePath = path.join(homeDir, 'AppData/Roaming/Claude/skills')
  } else if (platform === 'darwin') {
    claudePath = path.join(homeDir, 'Library/Application Support/Claude/skills')
  } else {
    // Linux
    claudePath = path.join(process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), 'claude/skills')
  }

  // Gemini 和 Codex 在所有平台都使用 ~/.xxx
  const geminiPath = path.join(homeDir, '.gemini/skills')
  const codexPath = path.join(homeDir, '.codex/skills')

  return {
    masterDir: path.join(homeDir, 'AISkills'),
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
    apps: [
      {
        name: 'Claude',
        skillsPath: claudePath,
        enabled: true,
      },
      {
        name: 'Gemini CLI',
        skillsPath: geminiPath,
        enabled: true,
      },
      {
        name: 'Codex',
        skillsPath: codexPath,
        enabled: true,
      },
    ],
  }
}

export function getConfigPath(cwd = process.cwd()) {
  return path.join(cwd, CONFIG_FILENAME)
}

export function configExists(cwd = process.cwd()) {
  return fs.existsSync(getConfigPath(cwd))
}

export function readConfig(cwd = process.cwd()) {
  const configPath = getConfigPath(cwd)

  if (!fs.existsSync(configPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    return yaml.load(content)
  } catch (error) {
    logger.error(`读取配置文件失败: ${error.message}`)
    return null
  }
}

export function writeConfig(config, cwd = process.cwd()) {
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
    logger.error(`写入配置文件失败: ${error.message}`)
    return false
  }
}

export function validateConfig(config) {
  const errors = []

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

export function ensureConfig(cwd = process.cwd()) {
  const config = readConfig(cwd)

  if (!config) {
    logger.error('请先运行 skills-link setup 初始化配置')
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

export function getEnabledApps(config) {
  if (!config || !config.apps) return []
  return config.apps.filter((app) => app.enabled !== false)
}

export function findAppByName(config, name) {
  if (!config || !config.apps) return null
  return config.apps.find(
    (app) => app.name.toLowerCase() === name.toLowerCase(),
  )
}

export function addApp(config, app) {
  const newConfig = { ...config }
  newConfig.apps = [...(newConfig.apps || []), app]
  return newConfig
}

export function updateApp(config, name, updates) {
  const newConfig = { ...config }
  newConfig.apps = newConfig.apps.map((app) =>
    app.name.toLowerCase() === name.toLowerCase()
      ? { ...app, ...updates }
      : app,
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
}
