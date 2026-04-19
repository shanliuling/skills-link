#!/usr/bin/env node

import { program } from 'commander'
import { runSetup } from '../dist/commands/setup.js'
import { runImport } from '../dist/commands/import.js'
import { runLink } from '../dist/commands/link.js'
import { runSync } from '../dist/commands/sync.js'
import { runWatch } from '../dist/commands/watch.js'
import { runHealth } from '../dist/commands/health.js'
import { runRollback } from '../dist/commands/rollback.js'
import { runApp } from '../dist/commands/app.js'
import { runList } from '../dist/commands/list.js'
import { runInit } from '../dist/commands/init.js'
import { runClone } from '../dist/commands/clone.js'
import { runStart } from '../dist/commands/start.js'
import { runReset } from '../dist/commands/reset.js'
import { runRemove } from '../dist/commands/remove.js'
import { initI18n, getLocalePriority, t } from '../dist/core/i18n.js'
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
  const configLang = config?.language || null
  const locale = getLocalePriority(cliLang, configLang)
  initI18n(locale)
}

initLanguage()

program
  .name('skills-link')
  .description(t('cli.description'))
  .version(pkg.version)
  .option('--lang <lang>', t('cli.langOption'), 'en')

program
  .command('setup')
  .description(t('cli.commands.setup'))
  .action(runSetup)

program
  .command('import')
  .description(t('cli.commands.import'))
  .option('-y, --yes', t('cli.options.skipConfirm'))
  .action((options) => runImport(options))

program
  .command('link')
  .description(t('cli.commands.link'))
  .option('-a, --app <name>', t('cli.options.app'))
  .option('-d, --dry-run', t('cli.options.dryRun'))
  .action((options) => runLink(options))

program
  .command('sync')
  .description(t('cli.commands.sync'))
  .option('-m, --message <message>', t('cli.options.message'))
  .action((options) => runSync(options))

program
  .command('watch')
  .description(t('cli.commands.watch'))
  .action(runWatch)

program
  .command('health')
  .description(t('cli.commands.health'))
  .action(runHealth)

program
  .command('rollback')
  .description(t('cli.commands.rollback'))
  .action(runRollback)

program
  .command('list')
  .description(t('cli.commands.list'))
  .action(runList)

program
  .command('init')
  .description(t('cli.commands.init'))
  .action(runInit)

program
  .command('clone [repo]')
  .description(t('cli.commands.clone'))
  .action((repo) => runClone({ repo }))

program
  .command('app')
  .description(t('cli.commands.app'))
  .action(runApp)

program
  .command('reset')
  .description(t('cli.commands.reset'))
  .option('-d, --dry-run', t('cli.options.dryRun'))
  .action((options) => runReset(options))

program
  .command('remove')
  .description(t('cli.commands.remove'))
  .action(runRemove)

if (process.argv.length === 2) {
  runStart()
} else {
  program.parse()
}
