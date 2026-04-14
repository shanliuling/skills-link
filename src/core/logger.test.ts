/**
 * logger.test.ts - logger 模块测试
 */

import { describe, it, expect } from 'vitest'
import { logger } from './logger.js'

describe('logger', () => {
  it('should have all required methods', () => {
    expect(logger).toHaveProperty('success')
    expect(logger).toHaveProperty('error')
    expect(logger).toHaveProperty('warn')
    expect(logger).toHaveProperty('info')
    expect(logger).toHaveProperty('log')
    expect(logger).toHaveProperty('hint')
    expect(logger).toHaveProperty('title')
    expect(logger).toHaveProperty('newline')
  })

  it('should return colored text', () => {
    const successText = logger.successText('test')
    expect(typeof successText).toBe('string')
    expect(successText).toContain('test')

    const errorText = logger.errorText('test')
    expect(typeof errorText).toBe('string')
    expect(errorText).toContain('test')

    const dimText = logger.dim('test')
    expect(typeof dimText).toBe('string')
    expect(dimText).toContain('test')
  })
})
