import dotenv from 'dotenv';

dotenv.config();

/**
 * 日志级别枚举
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * 日志级别映射
 */
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  'error': LogLevel.ERROR,
  'warn': LogLevel.WARN,
  'info': LogLevel.INFO,
  'debug': LogLevel.DEBUG,
};

/**
 * 日志颜色配置（用于终端输出）
 */
const LOG_COLORS = {
  ERROR: '\x1b[31m', // 红色
  WARN: '\x1b[33m',  // 黄色
  INFO: '\x1b[36m',  // 青色
  DEBUG: '\x1b[90m', // 灰色
  RESET: '\x1b[0m',  // 重置
};

/**
 * Logger 类 - 提供分级日志功能
 */
class Logger {
  private currentLevel: LogLevel;

  constructor() {
    // 从环境变量读取日志级别，默认为 INFO
    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
    this.currentLevel = LOG_LEVEL_MAP[envLevel] ?? LogLevel.INFO;
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    return prefix;
  }

  /**
   * 输出日志
   */
  private log(level: LogLevel, levelName: string, color: string, ...args: any[]): void {
    if (level <= this.currentLevel) {
      const prefix = this.formatMessage(levelName);
      console.log(color + prefix + LOG_COLORS.RESET, ...args);
    }
  }

  /**
   * ERROR 级别日志 - 用于错误信息
   */
  error(...args: any[]): void {
    this.log(LogLevel.ERROR, 'ERROR', LOG_COLORS.ERROR, ...args);
  }

  /**
   * WARN 级别日志 - 用于警告信息
   */
  warn(...args: any[]): void {
    this.log(LogLevel.WARN, 'WARN', LOG_COLORS.WARN, ...args);
  }

  /**
   * INFO 级别日志 - 用于一般信息
   */
  info(...args: any[]): void {
    this.log(LogLevel.INFO, 'INFO', LOG_COLORS.INFO, ...args);
  }

  /**
   * DEBUG 级别日志 - 用于调试信息
   */
  debug(...args: any[]): void {
    this.log(LogLevel.DEBUG, 'DEBUG', LOG_COLORS.DEBUG, ...args);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      const mappedLevel = LOG_LEVEL_MAP[level.toLowerCase()];
      if (mappedLevel !== undefined) {
        this.currentLevel = mappedLevel;
      } else {
        console.warn(`Invalid log level: ${level}. Using current level.`);
      }
    } else {
      this.currentLevel = level;
    }
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.currentLevel;
  }

  /**
   * 获取当前日志级别名称
   */
  getLevelName(): string {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    return levelNames[this.currentLevel] || 'UNKNOWN';
  }
}

// 导出单例实例
export const logger = new Logger();

// 默认导出
export default logger;
