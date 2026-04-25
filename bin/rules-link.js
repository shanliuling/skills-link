#!/usr/bin/env node

import { runRules } from '../dist/commands/rules.js'
import { initI18n, getLocalePriority } from '../dist/core/i18n.js'
import { readConfig } from '../dist/core/config.js'

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8'),
)

function parseLangArg() {
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' && args[i + 1]) {
      return args[i + 1]
    }
    if (args[i].startsWith('--lang=')) {
      return args[i].split('=')[1]
    }
  }
  return null
}

function initLanguage() {
  const cliLang = parseLangArg()
  const config = readConfig()
  // 语言优先级：命令行 > 配置文件 > 系统自动检测
  const locale = getLocalePriority(cliLang, config?.language)
  initI18n(locale)
}

initLanguage()

runRules().catch((error) => {
  console.error('Error:', error.message || error)
  if (error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
})
