/**
 * Logger 使用示例
 * 
 * 这个文件展示了如何在项目中使用 logger
 */

import { logger } from './logger';

// ============================================
// 示例 1: 基本使用
// ============================================
export function basicExample() {
  logger.info('Application starting...');
  logger.debug('Debug information:', { version: '1.0.0', env: 'development' });
  logger.warn('This is a warning message');
  logger.error('This is an error message');
}

// ============================================
// 示例 2: 数据库操作日志
// ============================================
export async function databaseExample() {
  logger.info('Connecting to database...');
  
  try {
    // 模拟数据库连接
    logger.debug('Database config:', { host: 'localhost', port: 5432 });
    
    // 模拟查询
    logger.debug('Executing query:', 'SELECT * FROM users');
    
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

// ============================================
// 示例 3: API 请求日志
// ============================================
export async function apiExample(endpoint: string) {
  logger.info('Making API request:', endpoint);
  
  try {
    const startTime = Date.now();
    
    // 模拟 API 调用
    logger.debug('Request headers:', { 'Content-Type': 'application/json' });
    
    // 模拟响应
    const duration = Date.now() - startTime;
    logger.info('API request completed:', { endpoint, duration: `${duration}ms` });
    
    if (duration > 1000) {
      logger.warn('API response slow:', { endpoint, duration: `${duration}ms` });
    }
  } catch (error) {
    logger.error('API request failed:', { endpoint, error });
    throw error;
  }
}

// ============================================
// 示例 4: WebSocket 连接日志
// ============================================
export function websocketExample(clientId: string) {
  logger.info('New WebSocket connection:', clientId);
  logger.debug('Client details:', { clientId, timestamp: new Date().toISOString() });
  
  // 模拟消息接收
  logger.debug('Message received from client:', clientId);
  
  // 模拟连接关闭
  logger.info('WebSocket connection closed:', clientId);
}

// ============================================
// 示例 5: 健康检查日志
// ============================================
export async function healthCheckExample(nodeId: string) {
  logger.info('Starting health check for node:', nodeId);
  
  try {
    logger.debug('Health check parameters:', { nodeId, timeout: 5000 });
    
    // 模拟健康检查
    const isHealthy = Math.random() > 0.2;
    
    if (isHealthy) {
      logger.info('Health check passed:', nodeId);
    } else {
      logger.warn('Health check failed:', nodeId);
    }
    
    return isHealthy;
  } catch (error) {
    logger.error('Health check error:', { nodeId, error });
    return false;
  }
}

// ============================================
// 示例 6: 错误处理日志
// ============================================
export function errorHandlingExample() {
  try {
    // 模拟可能出错的操作
    throw new Error('Something went wrong');
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Operation failed:', {
        message: error.message,
        stack: error.stack
      });
    } else {
      logger.error('Unknown error occurred:', error);
    }
  }
}

// ============================================
// 示例 7: 定时任务日志
// ============================================
export function scheduledTaskExample() {
  logger.info('Scheduled task started');
  
  try {
    // 模拟任务执行
    logger.debug('Processing items...');
    
    const itemsProcessed = 100;
    logger.info('Scheduled task completed:', { itemsProcessed });
  } catch (error) {
    logger.error('Scheduled task failed:', error);
  }
}

// ============================================
// 示例 8: 性能监控日志
// ============================================
export function performanceExample() {
  const startTime = Date.now();
  
  logger.debug('Starting performance-critical operation');
  
  // 模拟耗时操作
  const duration = Date.now() - startTime;
  
  logger.debug('Operation completed:', { duration: `${duration}ms` });
  
  if (duration > 100) {
    logger.warn('Operation took longer than expected:', { duration: `${duration}ms` });
  }
}

// ============================================
// 示例 9: 条件日志
// ============================================
export function conditionalLoggingExample(data: any[]) {
  logger.info('Processing batch:', { totalItems: data.length });
  
  let successCount = 0;
  let errorCount = 0;
  
  data.forEach((item, index) => {
    try {
      // 模拟处理
      const success = Math.random() > 0.1;
      
      if (success) {
        successCount++;
        // 只在 debug 级别记录成功的项目
        logger.debug('Item processed successfully:', { index, itemId: item.id });
      } else {
        errorCount++;
        // 错误总是记录
        logger.error('Item processing failed:', { index, itemId: item.id });
      }
    } catch (error) {
      errorCount++;
      logger.error('Unexpected error processing item:', { index, error });
    }
  });
  
  logger.info('Batch processing completed:', { 
    total: data.length, 
    success: successCount, 
    errors: errorCount 
  });
}

// ============================================
// 示例 10: 动态日志级别
// ============================================
export function dynamicLogLevelExample() {
  logger.info('Current log level:', logger.getLevelName());
  
  // 临时提高日志级别进行调试
  const originalLevel = logger.getLevel();
  logger.setLevel('debug');
  
  logger.debug('This debug message will now be visible');
  
  // 恢复原来的日志级别
  logger.setLevel(originalLevel);
  
  logger.info('Log level restored to:', logger.getLevelName());
}

// ============================================
// 运行所有示例（仅用于测试）
// ============================================
export function runAllExamples() {
  console.log('\n=== Running Logger Examples ===\n');
  
  basicExample();
  databaseExample();
  apiExample('/api/users');
  websocketExample('client-123');
  healthCheckExample('node-456');
  errorHandlingExample();
  scheduledTaskExample();
  performanceExample();
  conditionalLoggingExample([
    { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }
  ]);
  dynamicLogLevelExample();
  
  console.log('\n=== Examples Completed ===\n');
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples();
}
