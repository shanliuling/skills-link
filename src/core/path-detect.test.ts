/**
 * path-detect.test.ts - path-detect 模块测试
 */

import { describe, it, expect } from 'vitest'
import { detectAppPath, detectAllAppPaths, detectMasterDir } from './path-detect.js'
import path from 'path'
import os from 'os'

describe('path-detect', () => {
  it('should return path for known apps', () => {
    const claudePath = detectAppPath('Claude')
    expect(claudePath).toBeDefined()
    expect(typeof claudePath).toBe('string')
  })

  it('should return null for unknown apps', () => {
    const unknownPath = detectAppPath('UnknownApp')
    expect(unknownPath).toBeNull()
  })

  it('should detect all app paths', () => {
    const apps = detectAllAppPaths()

    expect(Array.isArray(apps)).toBe(true)
    expect(apps.length).toBeGreaterThan(0)

    // 检查返回的应用对象结构
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

    // 根据平台检查路径
    if (process.platform === 'win32') {
      expect(masterDir).toMatch(/AISkills$/)
    } else if (process.platform === 'darwin') {
      expect(masterDir).toMatch(/AISkills$/)
    } else {
      // Linux
      expect(masterDir).toMatch(/aiskills$/i)
    }
  })

  it('should support case-insensitive app name matching', () => {
    const path1 = detectAppPath('Claude')
    const path2 = detectAppPath('claude')
    const path3 = detectAppPath('CLAUDE')

    // 所有大小写形式应该返回相同的路径
    expect(path1).toBe(path2)
    expect(path2).toBe(path3)
  })

  it('should have multiple supported apps', () => {
    const apps = detectAllAppPaths()

    // 应该至少支持 3 个应用（Claude, Gemini CLI, Codex 是基础的）
    expect(apps.length).toBeGreaterThanOrEqual(3)

    const appNames = apps.map(a => a.name)
    expect(appNames).toContain('Claude')
    expect(appNames).toContain('Gemini CLI')
    expect(appNames).toContain('Codex')
  })
})
