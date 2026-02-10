# Logger 集成示例

本文档展示如何将 logger 集成到现有代码中，替换 `console.log`、`console.error` 等调用。

## 📝 集成步骤

### 1. 在 .env 文件中添加配置

```env
# 日志级别配置
LOG_LEVEL=info

# 开发环境可以使用 debug
# LOG_LEVEL=debug

# 生产环境建议使用 warn 或 error
# LOG_LEVEL=warn
```

### 2. 在代码中导入 logger

在文件顶部添加导入语句：

```typescript
import { logger } from './utils/logger';
```

### 3. 替换现有的 console 调用

## 🔄 代码迁移示例

### 示例 1: index.ts 主文件

**修改前：**

```typescript
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 错误处理中间件
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

**修改后：**

```typescript
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { logger } from './utils/logger';  // 添加 logger 导入

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 错误处理中间件
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Error:', err);  // 使用 logger.error 替代 console.error
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);  // 使用 logger.info
});
```

### 示例 2: API 路由处理

**修改前：**

```typescript
app.get('/api/environments', async (req: Request, res: Response) => {
  try {
    console.log('Fetching environments...');
    const environments = await envManager.listEnvironments();
    console.log('Environments fetched:', environments.length);
    res.json({ success: true, data: environments });
  } catch (error: any) {
    console.error('Failed to fetch environments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**修改后：**

```typescript
app.get('/api/environments', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching environments...');
    const environments = await envManager.listEnvironments();
    logger.debug('Environments fetched:', environments.length);  // 详细信息用 debug
    res.json({ success: true, data: environments });
  } catch (error: any) {
    logger.error('Failed to fetch environments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 示例 3: WebSocket 服务

**修改前：**

```typescript
export class WebSocketService {
  constructor() {
    console.log('WebSocketService initialized');
  }

  handleConnection(ws: WebSocket, clientId: string) {
    console.log('New client connected:', clientId);
    
    ws.on('message', (message) => {
      console.log('Received message:', message);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    ws.on('close', () => {
      console.log('Client disconnected:', clientId);
    });
  }
}
```

**修改后：**

```typescript
import { logger } from '../utils/logger';

export class WebSocketService {
  constructor() {
    logger.info('WebSocketService initialized');
  }

  handleConnection(ws: WebSocket, clientId: string) {
    logger.info('New client connected:', clientId);
    
    ws.on('message', (message) => {
      logger.debug('Received message:', message);  // 消息详情用 debug
    });
    
    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
    
    ws.on('close', () => {
      logger.info('Client disconnected:', clientId);
    });
  }
}
```

### 示例 4: 健康检查调度器

**修改前：**

```typescript
export class HealthCheckScheduler {
  async performHealthCheck(nodeId: string) {
    console.log('Starting health check for node:', nodeId);
    
    try {
      const result = await this.checkNode(nodeId);
      
      if (result.healthy) {
        console.log('Health check passed:', nodeId);
      } else {
        console.warn('Health check failed:', nodeId, result.reason);
      }
      
      return result;
    } catch (error) {
      console.error('Health check error:', nodeId, error);
      throw error;
    }
  }
}
```

**修改后：**

```typescript
import { logger } from '../utils/logger';

export class HealthCheckScheduler {
  async performHealthCheck(nodeId: string) {
    logger.info('Starting health check for node:', nodeId);
    
    try {
      const result = await this.checkNode(nodeId);
      
      if (result.healthy) {
        logger.debug('Health check passed:', nodeId);  // 成功的检查用 debug
      } else {
        logger.warn('Health check failed:', nodeId, result.reason);
      }
      
      return result;
    } catch (error) {
      logger.error('Health check error:', nodeId, error);
      throw error;
    }
  }
}
```

### 示例 5: 数据库初始化

**修改前：**

```typescript
export async function initializeDatabase() {
  console.log('Initializing database...');
  
  try {
    const db = await Database.open('./data/monitoring.db');
    console.log('Database opened successfully');
    
    await db.exec('CREATE TABLE IF NOT EXISTS ...');
    console.log('Database schema created');
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
```

**修改后：**

```typescript
import { logger } from '../utils/logger';

export async function initializeDatabase() {
  logger.info('Initializing database...');
  
  try {
    const db = await Database.open('./data/monitoring.db');
    logger.info('Database opened successfully');
    
    await db.exec('CREATE TABLE IF NOT EXISTS ...');
    logger.debug('Database schema created');  // 详细步骤用 debug
    
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}
```

### 示例 6: 数据推送调度器

**修改前：**

```typescript
export class DataPushScheduler {
  private scheduleDebounce() {
    console.log('Scheduling debounced push...');
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      console.log('Cleared previous debounce timer');
    }
    
    this.debounceTimer = setTimeout(() => {
      console.log('Executing debounced push');
      this.pushData();
    }, this.debounceMs);
  }
}
```

**修改后：**

```typescript
import { logger } from '../utils/logger';

export class DataPushScheduler {
  private scheduleDebounce() {
    logger.debug('Scheduling debounced push...');  // 内部调度用 debug
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      logger.debug('Cleared previous debounce timer');
    }
    
    this.debounceTimer = setTimeout(() => {
      logger.info('Executing debounced push');  // 实际推送用 info
      this.pushData();
    }, this.debounceMs);
  }
}
```

## 📊 日志级别使用指南

### ERROR - 错误级别
用于记录错误和异常：

```typescript
// 数据库错误
logger.error('Database connection failed:', error);

// API 调用失败
logger.error('Failed to fetch data from external API:', error);

// 业务逻辑错误
logger.error('Payment processing failed:', { orderId, error });

// 未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});
```

### WARN - 警告级别
用于记录警告和潜在问题：

```typescript
// 性能警告
logger.warn('API response time exceeded threshold:', { duration, threshold });

// 资源警告
logger.warn('Memory usage high:', { used, total });

// 健康检查失败
logger.warn('Health check failed for node:', nodeId);

// 配置问题
logger.warn('Using default configuration, .env file not found');
```

### INFO - 信息级别
用于记录重要的业务流程和状态变化：

```typescript
// 服务启动/停止
logger.info('Server started on port:', PORT);
logger.info('Server shutting down...');

// 连接建立/断开
logger.info('New WebSocket connection:', clientId);
logger.info('Client disconnected:', clientId);

// 重要业务操作
logger.info('User logged in:', userId);
logger.info('Order created:', orderId);

// 定时任务
logger.info('Scheduled health check started');
logger.info('Data backup completed');
```

### DEBUG - 调试级别
用于记录详细的调试信息：

```typescript
// 请求详情
logger.debug('Request received:', { method, path, body });

// 数据库查询
logger.debug('Executing query:', query);

// 中间步骤
logger.debug('Processing item:', { index, itemId });

// 配置信息
logger.debug('Configuration loaded:', config);

// 变量值
logger.debug('Current state:', { status, count, lastUpdate });
```

## 🎯 快速替换命令

使用以下命令快速替换项目中的 console 调用：

### 使用 VS Code 查找替换

1. 打开查找替换（Ctrl+Shift+H 或 Cmd+Shift+H）
2. 启用正则表达式模式
3. 使用以下模式：

**替换 console.log：**
- 查找: `console\.log\(`
- 替换: `logger.info(`

**替换 console.error：**
- 查找: `console\.error\(`
- 替换: `logger.error(`

**替换 console.warn：**
- 查找: `console\.warn\(`
- 替换: `logger.warn(`

**替换 console.debug：**
- 查找: `console\.debug\(`
- 替换: `logger.debug(`

### 注意事项

1. **不要忘记添加导入语句**：
   ```typescript
   import { logger } from './utils/logger';
   ```

2. **根据上下文选择合适的日志级别**：
   - 不是所有 `console.log` 都应该替换为 `logger.info`
   - 详细的调试信息应该使用 `logger.debug`
   - 错误必须使用 `logger.error`

3. **检查相对路径**：
   - 根据文件位置调整导入路径
   - 例如：`'./utils/logger'` 或 `'../utils/logger'`

## ✅ 验证集成

### 1. 测试不同日志级别

在 `.env` 中设置：
```env
LOG_LEVEL=debug
```

运行应用，应该看到所有级别的日志。

### 2. 测试日志过滤

在 `.env` 中设置：
```env
LOG_LEVEL=warn
```

运行应用，应该只看到 WARN 和 ERROR 级别的日志。

### 3. 检查日志格式

确保日志输出包含：
- 时间戳
- 日志级别
- 消息内容
- 颜色编码（在支持的终端中）

## 🚀 下一步

1. **逐步迁移**：从主文件开始，逐步迁移各个模块
2. **调整日志级别**：根据实际需要调整各处的日志级别
3. **清理代码**：移除不必要的日志调用
4. **配置生产环境**：在生产环境使用 `warn` 或 `error` 级别

## 📚 相关文档

- [Logger 使用指南](./README.md)
- [Logger 示例代码](./logger.example.ts)
- [环境变量配置](../../ENV_CONFIG.md)
