/**
 * i18n.js - 国际化核心模块
 *
 * 提供多语言支持，语言选择优先级：
 * 1. CLI 参数 --lang <zh|en>
 * 2. 配置文件中的 language
 * 3. 环境变量 SKILLS_SYNC_LANG
 * 4. 系统 locale 自动推断
 * 5. 默认回退英文 en
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES_DIR = path.join(__dirname, '../locales')

let currentLocale = null
let translations = {}

const SUPPORTED_LOCALES = ['zh', 'en']
const DEFAULT_LOCALE = 'en'

function detectSystemLocale() {
  try {
    const envLang =
      process.env.LANG ||
      process.env.LC_ALL ||
      process.env.LC_MESSAGES ||
      process.env.LANGUAGE ||
      ''

    const lang = envLang.toLowerCase()
    if (lang.startsWith('zh')) return 'zh'
    if (lang.startsWith('en')) return 'en'

    if (process.platform === 'win32') {
      const locale = process.env.WINLOCALE || process.env.LOCALE || ''
      if (locale.toLowerCase().startsWith('zh')) return 'zh'
    }

    return DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

export function getLocalePriority(cliLang, configLang) {
  if (cliLang && SUPPORTED_LOCALES.includes(cliLang)) {
    return cliLang
  }

  if (configLang && SUPPORTED_LOCALES.includes(configLang)) {
    return configLang
  }

  const envLang = process.env.SKILLS_SYNC_LANG
  if (envLang && SUPPORTED_LOCALES.includes(envLang)) {
    return envLang
  }

  return detectSystemLocale()
}

export function initI18n(locale) {
  const finalLocale = SUPPORTED_LOCALES.includes(locale)
    ? locale
    : DEFAULT_LOCALE
  currentLocale = finalLocale

  const localeFile = path.join(LOCALES_DIR, `${finalLocale}.json`)

  try {
    if (fs.existsSync(localeFile)) {
      const content = fs.readFileSync(localeFile, 'utf-8')
      translations = JSON.parse(content)
    } else {
      const fallbackFile = path.join(LOCALES_DIR, `${DEFAULT_LOCALE}.json`)
      if (fs.existsSync(fallbackFile)) {
        const content = fs.readFileSync(fallbackFile, 'utf-8')
        translations = JSON.parse(content)
      } else {
        translations = {}
      }
    }
  } catch (error) {
    console.error(`Failed to load locale file: ${error.message}`)
    translations = {}
  }
}

export function t(key, params = {}) {
  const keys = key.split('.')
  let value = translations

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return key
    }
  }

  if (typeof value !== 'string') {
    return key
  }

  let result = value
  for (const [paramKey, paramValue] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue)
  }

  return result
}

export function getCurrentLocale() {
  return currentLocale || DEFAULT_LOCALE
}

export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES]
}

export default {
  initI18n,
  t,
  getLocalePriority,
  getCurrentLocale,
  getSupportedLocales,
}
