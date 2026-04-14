/**
 * types/commands.ts - 命令相关的类型定义
 */

export interface SetupOptions {
  language?: string
}

export interface ImportOptions {
  yes?: boolean
}

export interface LinkOptions {
  app?: string
  dryRun?: boolean
}

export interface SyncOptions {
  message?: string
}

export interface CloneOptions {
  repo?: string
}

export interface AppOptions {
  subcommand?: 'add' | 'list'
  name?: string
  path?: string
}
