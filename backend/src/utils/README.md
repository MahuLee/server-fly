# Logger 使用指南

## 📖 简介

Logger 是一个轻量级的日志工具类，支持分级日志输出，可以通过环境变量 `LOG_LEVEL` 控制日志输出级别。

## 🚀 快速开始

### 1. 导入 Logger

```typescript
import { logger } from './utils/logger';
// 或
import logger from './utils/logger';
```

### 2. 使用日志方法

```typescript
// 错误日志 - 用于记录错误信息
logger.error('Database connection failed:', error);

// 警告日志 - 用于记录警告信息
logger.warn('API rate limit approaching:', currentRate);

// 信息日志 - 用于记录一般信息
logger.info('Server started on port:', PORT);

// 调试日志 - 用于记录调试信息
logger.debug('Request payload:', requestData);
```

## 📊 日志级别

Logger 支持 4 个日志级别，从低到高依次为：

| 级别 | 数值 | 说明 | 使用场景 |
|------|------|------|----------|
| `ERROR` | 0 | 错误 | 系统错误、异常、失败操作 |
| `WARN` | 1 | 警告 | 潜在问题、不推荐的操作 |
| `INFO` | 2 | 信息 | 重要的业务流程、状态变化 |
| `DEBUG` | 3 | 调试 | 详细的调试信息、变量值 |

**级别规则：** 设置某个级别后，该级别及以下级别的日志都会输出。

例如：
- 设置 `LOG_LEVEL=warn` 时，只输出 `ERROR` 和 `WARN` 级别的日志
- 设置 `LOG_LEVEL=info` 时，输出 `ERROR`、`WARN` 和 `INFO` 级别的日志
- 设置 `LOG_LEVEL=debug` 时，输出所有级别的日志

## ⚙️ 配置

### 环境变量配置

在 `.env` 文件中设置日志级别：

```env
# 日志级别：error, warn, info, debug
LOG_LEVEL=info
```

### 不同环境的推荐配置

**开发环境：**
```env
LOG_LEVEL=debug
```

**测试环境：**
```env
LOG_LEVEL=info
```

**生产环境：**
```env
LOG_LEVEL=warn
```

## 💡 使用示例

### 示例 1：基本使用

```typescript
import { logger } from './utils/logger';

function connectDatabase() {
  logger.info('Connecting to database...');
  
  try {
    // 数据库连接逻辑
    logger.debug('Connection parameters:', { host, port, database });
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}
```

### 示例 2：在 Express 中间件中使用

```typescript
import { logger } from './utils/logger';

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  logger.debug('Request headers:', req.headers);
  logger.debug('Request body:', req.body);
  next();
});

app.use((err, req, res, next) => {
  logger.error('Error occurred:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

### 示例 3：在异步操作中使用

```typescript
import { logger } from './utils/logger';

async function fetchUserData(userId: string) {
  logger.info('Fetching user data for:', userId);
  
  try {
    const response = await axios.get(`/api/users/${userId}`);
    logger.debug('User data received:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      logger.warn('User not found:', userId);
    } else {
      logger.error('Failed to fetch user data:', error);
    }
    throw error;
  }
}
```

### 示例 4：在定时任务中使用

```typescript
import { logger } from './utils/logger';
import cron from 'node-cron';

cron.schedule('*/5 * * * *', () => {
  logger.info('Running scheduled health check...');
  
  try {
    performHealthCheck();
    logger.info('Health check completed successfully');
  } catch (error) {
    logger.error('Health check failed:', error);
  }
});
```

### 示例 5：在 WebSocket 服务中使用

```typescript
import { logger } from './utils/logger';

wss.on('connection', (ws, req) => {
  const clientId = generateClientId();
  logger.info('New WebSocket connection:', clientId);
  logger.debug('Client info:', { ip: req.socket.remoteAddress, headers: req.headers });
  
  ws.on('message', (message) => {
    logger.debug('Received message from', clientId, ':', message);
  });
  
  ws.on('close', () => {
    logger.info('WebSocket connection closed:', clientId);
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error for', clientId, ':', error);
  });
});
```

## 🎨 日志格式

日志输出格式：

```
[2025-01-22T10:30:45.123Z] [INFO] Server started on port: 3001
[2025-01-22T10:30:46.456Z] [DEBUG] Database connection pool initialized
[2025-01-22T10:30:50.789Z] [WARN] API rate limit approaching: 95%
[2025-01-22T10:31:00.012Z] [ERROR] Failed to connect to external service: Connection timeout
```

**格式说明：**
- `[时间戳]`：ISO 8601 格式的时间戳
- `[级别]`：日志级别（带颜色）
- `消息内容`：实际的日志消息和参数

**颜色编码：**
- 🔴 `ERROR`：红色
- 🟡 `WARN`：黄色
- 🔵 `INFO`：青色
- ⚪ `DEBUG`：灰色

## 🔧 高级功能

### 动态修改日志级别

```typescript
import { logger, LogLevel } from './utils/logger';

// 方式 1：使用字符串
logger.setLevel('debug');

// 方式 2：使用枚举
logger.setLevel(LogLevel.DEBUG);

// 获取当前日志级别
const currentLevel = logger.getLevel();
const levelName = logger.getLevelName();
console.log(`Current log level: ${levelName} (${currentLevel})`);
```

### 在运行时切换日志级别

```typescript
// 创建一个 API 端点来动态调整日志级别
app.post('/api/admin/log-level', (req, res) => {
  const { level } = req.body;
  
  try {
    logger.setLevel(level);
    logger.info('Log level changed to:', level);
    res.json({ success: true, level: logger.getLevelName() });
  } catch (error) {
    logger.error('Failed to change log level:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});
```

## 📝 最佳实践

### 1. 选择合适的日志级别

```typescript
// ✅ 正确：使用 error 记录错误
logger.error('Database query failed:', error);

// ❌ 错误：使用 info 记录错误
logger.info('Database query failed:', error);

// ✅ 正确：使用 info 记录重要业务流程
logger.info('User logged in:', userId);

// ❌ 错误：使用 debug 记录重要业务流程
logger.debug('User logged in:', userId);

// ✅ 正确：使用 debug 记录详细调试信息
logger.debug('Processing request with params:', params);

// ❌ 错误：使用 info 记录过多细节
logger.info('Processing request with params:', params);
```

### 2. 提供有用的上下文信息

```typescript
// ✅ 正确：提供足够的上下文
logger.error('Failed to update user profile:', { userId, error: error.message });

// ❌ 错误：信息不足
logger.error('Update failed');

// ✅ 正确：包含相关数据
logger.info('Order created:', { orderId, userId, amount, items: items.length });

// ❌ 错误：缺少关键信息
logger.info('Order created');
```

### 3. 避免记录敏感信息

```typescript
// ❌ 危险：记录密码
logger.debug('User login:', { username, password });

// ✅ 安全：不记录敏感信息
logger.debug('User login:', { username });

// ❌ 危险：记录完整的信用卡号
logger.info('Payment processed:', { cardNumber });

// ✅ 安全：只记录部分信息
logger.info('Payment processed:', { cardLast4: cardNumber.slice(-4) });
```

### 4. 合理使用日志级别

```typescript
// 启动和关闭
logger.info('Server starting...');
logger.info('Server stopped');

// 配置加载
logger.info('Configuration loaded:', { port, environment });

// 数据库操作
logger.debug('Executing query:', query);
logger.info('Database migration completed');

// 外部 API 调用
logger.debug('Calling external API:', { url, method });
logger.warn('API response slow:', { url, duration });
logger.error('API call failed:', { url, error });

// 业务逻辑
logger.info('Processing order:', orderId);
logger.warn('Inventory low:', { productId, quantity });
logger.error('Payment failed:', { orderId, reason });
```

### 5. 性能考虑

```typescript
// ✅ 正确：避免在循环中过度记录
logger.info('Processing batch:', { totalItems: items.length });
items.forEach(item => {
  // 只在出错时记录
  if (hasError(item)) {
    logger.error('Item processing failed:', item.id);
  }
});
logger.info('Batch processing completed');

// ❌ 错误：在循环中记录每个项目
items.forEach(item => {
  logger.debug('Processing item:', item); // 可能产生大量日志
});
```

## 🐛 故障排查

### 问题：日志没有输出

**可能原因：**
1. `LOG_LEVEL` 设置过低（如设置为 `error`，则不会输出 `info` 日志）
2. `.env` 文件未加载
3. 环境变量配置错误

**解决方案：**
```typescript
// 检查当前日志级别
console.log('Current log level:', logger.getLevelName());

// 临时提高日志级别
logger.setLevel('debug');
```

### 问题：日志输出过多

**解决方案：**
1. 提高 `LOG_LEVEL`（如从 `debug` 改为 `info`）
2. 检查代码中是否有过多的日志调用
3. 在生产环境使用 `warn` 或 `error` 级别

### 问题：日志颜色不显示

**可能原因：**
- 终端不支持 ANSI 颜色代码
- 在某些 CI/CD 环境中颜色可能被禁用

**解决方案：**
- 使用支持颜色的终端（如 Windows Terminal、iTerm2）
- 颜色不影响日志功能，可以忽略

## 📚 相关文档

- [ENV_CONFIG.md](../ENV_CONFIG.md) - 环境变量配置说明
- [TypeScript Logger 类型定义](./logger.ts)

## 🔄 迁移指南

### 从 console.log 迁移

```typescript
// 旧代码
console.log('Server started');
console.error('Error:', error);

// 新代码
logger.info('Server started');
logger.error('Error:', error);
```

### 批量替换建议

```bash
# 使用 sed 或编辑器的查找替换功能
# console.log -> logger.info
# console.error -> logger.error
# console.warn -> logger.warn
```

## 💡 提示

1. **开发时使用 `debug` 级别**，可以看到所有日志，便于调试
2. **生产环境使用 `warn` 或 `error` 级别**，减少日志量，提高性能
3. **重要的业务流程使用 `info` 级别**，确保在生产环境也能追踪
4. **临时调试信息使用 `debug` 级别**，生产环境会自动过滤
5. **错误和异常必须使用 `error` 级别**，便于监控和告警
