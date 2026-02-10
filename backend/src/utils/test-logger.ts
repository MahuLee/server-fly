#!/usr/bin/env node

/**
 * Logger 测试脚本
 * 
 * 运行此脚本来测试 logger 的各种功能
 * 
 * 使用方法：
 *   npm run dev -- src/utils/test-logger.ts
 *   或
 *   ts-node src/utils/test-logger.ts
 */

import { logger, LogLevel } from './logger';

console.log('\n========================================');
console.log('Logger 功能测试');
console.log('========================================\n');

// 测试 1: 显示当前日志级别
console.log('📊 当前日志级别:', logger.getLevelName());
console.log('   (可以在 .env 文件中设置 LOG_LEVEL 来改变)\n');

// 测试 2: 测试所有日志级别
console.log('🧪 测试所有日志级别:\n');

logger.error('这是一条 ERROR 级别的日志 - 用于错误信息');
logger.warn('这是一条 WARN 级别的日志 - 用于警告信息');
logger.info('这是一条 INFO 级别的日志 - 用于一般信息');
logger.debug('这是一条 DEBUG 级别的日志 - 用于调试信息');

console.log('\n');

// 测试 3: 测试多参数日志
console.log('🔢 测试多参数日志:\n');

logger.info('用户登录:', { userId: '12345', username: 'john_doe', timestamp: new Date() });
logger.debug('请求详情:', { method: 'GET', path: '/api/users', query: { page: 1, limit: 10 } });
logger.warn('性能警告:', '响应时间', 1500, 'ms', '超过阈值', 1000, 'ms');
logger.error('数据库错误:', new Error('Connection timeout'));

console.log('\n');

// 测试 4: 测试日志级别过滤
console.log('🎯 测试日志级别过滤:\n');

const testLevels = ['error', 'warn', 'info', 'debug'];

testLevels.forEach(level => {
  console.log(`\n--- 设置日志级别为: ${level.toUpperCase()} ---`);
  logger.setLevel(level);
  
  logger.error('  ❌ ERROR 消息');
  logger.warn('  ⚠️  WARN 消息');
  logger.info('  ℹ️  INFO 消息');
  logger.debug('  🐛 DEBUG 消息');
});

console.log('\n');

// 测试 5: 实际场景模拟
console.log('🎬 实际场景模拟:\n');

// 恢复到 INFO 级别
logger.setLevel('info');

// 模拟服务器启动
logger.info('服务器启动中...');
logger.debug('加载配置文件:', { port: 3001, env: 'development' });
logger.info('数据库连接成功');
logger.info('WebSocket 服务已启动');
logger.info('服务器运行在端口: 3001');

console.log('');

// 模拟 API 请求
logger.info('收到 API 请求:', 'GET /api/users');
logger.debug('请求头:', { 'Content-Type': 'application/json', 'Authorization': 'Bearer ***' });
logger.debug('查询参数:', { page: 1, limit: 20 });
logger.info('API 请求处理完成:', { duration: '45ms', status: 200 });

console.log('');

// 模拟健康检查
logger.info('开始健康检查...');
logger.debug('检查节点:', 'node-001');
logger.warn('节点响应缓慢:', { nodeId: 'node-001', responseTime: '3500ms' });
logger.debug('检查节点:', 'node-002');
logger.info('健康检查完成:', { total: 2, healthy: 1, unhealthy: 1 });

console.log('');

// 模拟错误场景
logger.error('数据库连接失败:', {
  error: 'ECONNREFUSED',
  host: 'localhost',
  port: 5432,
  retries: 3
});

console.log('');

// 测试 6: 性能测试
console.log('⚡ 性能测试:\n');

const iterations = 1000;
const startTime = Date.now();

for (let i = 0; i < iterations; i++) {
  logger.debug('性能测试消息', i);
}

const duration = Date.now() - startTime;
logger.info(`完成 ${iterations} 次日志调用，耗时: ${duration}ms`);

console.log('\n');

// 测试 7: 动态切换日志级别
console.log('🔄 动态切换日志级别:\n');

logger.info('当前级别:', logger.getLevelName());
logger.info('切换到 DEBUG 级别...');
logger.setLevel(LogLevel.DEBUG);
logger.debug('现在可以看到 DEBUG 日志了！');
logger.info('切换回 INFO 级别...');
logger.setLevel(LogLevel.INFO);
logger.debug('这条 DEBUG 日志不会显示');
logger.info('但 INFO 日志会显示');

console.log('\n');

// 总结
console.log('========================================');
console.log('✅ Logger 测试完成！');
console.log('========================================\n');

console.log('💡 提示:');
console.log('   - 在 .env 文件中设置 LOG_LEVEL=debug 可以看到所有日志');
console.log('   - 在 .env 文件中设置 LOG_LEVEL=error 只会看到错误日志');
console.log('   - 生产环境建议使用 LOG_LEVEL=warn 或 LOG_LEVEL=error');
console.log('   - 开发环境建议使用 LOG_LEVEL=debug 或 LOG_LEVEL=info\n');

// 显示环境变量配置
console.log('📝 当前环境变量:');
console.log('   LOG_LEVEL =', process.env.LOG_LEVEL || '(未设置，使用默认值 info)');
console.log('');
