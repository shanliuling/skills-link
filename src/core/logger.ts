/**
 * logger.ts - chalk 日志封装
 *
 * 提供统一的终端彩色输出，包含成功、错误、警告、信息等日志级别
 */

import chalk from 'chalk'

/**
 * 日志工具类
 */
export const logger = {
  /**
   * 成功日志 - 绿色带勾号
   */
  success(message: string): void {
    console.log(chalk.green('✔'), message)
  },

  /**
   * 错误日志 - 红色带叉号
   */
  error(message: string): void {
    console.log(chalk.red('✗'), message)
  },

  /**
   * 警告日志 - 黄色带警告符号
   */
  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message)
  },

  /**
   * 信息日志 - 蓝色带圆点
   */
  info(message: string): void {
    console.log(chalk.blue('●'), message)
  },

  /**
   * 普通日志
   */
  log(message: string): void {
    console.log(message)
  },

  /**
   * 提示日志 - 灰色带箭头
   */
  hint(message: string): void {
    console.log(chalk.gray('→'), chalk.gray(message))
  },

  /**
   * 标题日志 - 粗体
   */
  title(message: string): void {
    console.log()
    console.log(chalk.bold(message))
  },

  /**
   * 空行
   */
  newline(): void {
    console.log()
  },

  /**
   * 带颜色的成功消息（无符号）
   */
  successText(message: string): string {
    return chalk.green(message)
  },

  /**
   * 带颜色的错误消息（无符号）
   */
  errorText(message: string): string {
    return chalk.red(message)
  },

  /**
   * 带颜色的警告消息（无符号）
   */
  warnText(message: string): string {
    return chalk.yellow(message)
  },

  /**
   * 带颜色的信息消息（无符号）
   */
  infoText(message: string): string {
    return chalk.blue(message)
  },

  /**
   * 灰色文本
   */
  dim(message: string): string {
    return chalk.gray(message)
  },

  /**
   * 粗体文本
   */
  bold(message: string): string {
    return chalk.bold(message)
  },
}

export default logger
