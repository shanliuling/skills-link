/**
 * path-detect.test.ts - path-detect 模块测试
 */

import { describe, it, expect } from 'vitest'
import { detectAppPath, detectAllAppPaths, detectMasterDir, agentRegistry, resolveGlobalPath, getProjectSkillsDir } from './path-detect.js'
import path from 'path'
import os from 'os'

describe('path-detect', () => {
  it('should return path for known agents by id', () => {
    const claudePath = detectAppPath('claude')
    expect(claudePath).toBeDefined()
    expect(typeof claudePath).toBe('string')
  })

  it('should return null for unknown agents', () => {
    const unknownPath = detectAppPath('nonexistent-agent')
    expect(unknownPath).toBeNull()
  })

  it('should detect all agent paths from registry', () => {
    const apps = detectAllAppPaths()

    expect(Array.isArray(apps)).toBe(true)
    // 注册表里有多少个 agent 就应该有多少个结果
    expect(apps.length).toBe(Object.keys(agentRegistry).length)

    apps.forEach(app => {
      expect(app).toHaveProperty('name')
      expect(app).toHaveProperty('skillsPath')
      expect(app).toHaveProperty('exists')
      expect(typeof app.name).toBe('string')
    })
  })

  it('should detect master directory', () => {
    const masterDir = detectMasterDir()

    expect(masterDir).toBeDefined()
    expect(typeof masterDir).toBe('string')
    expect(masterDir.length).toBeGreaterThan(0)
  })

  it('should return correct master directory for platform', () => {
    const masterDir = detectMasterDir()

    if (process.platform === 'win32') {
      expect(masterDir).toMatch(/AISkills$/)
    } else if (process.platform === 'darwin') {
      expect(masterDir).toMatch(/AISkills$/)
    } else {
      expect(masterDir).toMatch(/aiskills$/i)
    }
  })

  it('should resolve ~ to home directory', () => {
    const result = resolveGlobalPath('~/.cursor/skills')
    expect(result).toBe(path.join(os.homedir(), '.cursor/skills'))
  })

  it('should resolve $XDG_CONFIG_HOME', () => {
    const result = resolveGlobalPath('$XDG_CONFIG_HOME/goose/skills')
    const expected = process.env.XDG_CONFIG_HOME
      ? path.join(process.env.XDG_CONFIG_HOME, 'goose/skills')
      : path.join(os.homedir(), '.config/goose/skills')
    expect(result).toBe(expected)
  })

  it('should return project skills dir for known agent', () => {
    expect(getProjectSkillsDir('cursor')).toBe('.cursor/skills')
    expect(getProjectSkillsDir('claude')).toBe('.claude/skills')
  })

  it('should return null for unknown agent project dir', () => {
    expect(getProjectSkillsDir('nonexistent')).toBeNull()
  })

  it('should support all 41 agents in registry', () => {
    const count = Object.keys(agentRegistry).length
    expect(count).toBeGreaterThanOrEqual(41)
  })
})
