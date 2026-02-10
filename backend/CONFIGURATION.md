# Server-Fly Backend - 配置说明

## 环境变量配置

项目使用 `.env` 文件来管理可变配置。请在 `backend` 目录下创建 `.env` 文件（可以复制 `.env.example`）。

### 配置项说明

```env
# WebSocket Configuration
# WebSocket心跳检测间隔（秒）
WEBSOCKET_PING_INTERVAL=30

# 数据推送间隔（秒）- 服务端向前端推送节点健康数据和指标数据的间隔
PUSH_MESSAGE_INTERVAL=5

# Server Configuration
PORT=3001
```

### 配置项详解

- **WEBSOCKET_PING_INTERVAL**: WebSocket 心跳检测间隔时间（秒）
  - 默认值: 30秒
  - 用途: 保持 WebSocket 连接活跃，检测断开的连接

- **PUSH_MESSAGE_INTERVAL**: 数据推送间隔时间（秒）
  - 默认值: 5秒
  - 用途: 服务端定期向前端推送最新的节点健康状态和指标数据
  - 说明: 每隔指定秒数，服务端会查询 `node_states` 和 `metrics_data` 表的最新数据并通过 WebSocket 推送给前端

- **PORT**: 服务器监听端口
  - 默认值: 3001

## 数据库变更

### metrics_data 表结构变更

**旧结构:**
```sql
CREATE TABLE metrics_data (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  timestamp DATETIME NOT NULL,
  threshold_violation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**新结构:**
```sql
CREATE TABLE metrics_data (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON 格式存储所有指标数据
  timestamp DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 数据格式

`data` 字段存储 JSON 数组，包含该时间点收集的所有指标：

```json
[
  {
    "name": "cpu_usage",
    "value": 45.5,
    "unit": "%",
    "thresholdViolation": null
  },
  {
    "name": "memory_usage",
    "value": 78.2,
    "unit": "%",
    "thresholdViolation": "warning"
  }
]
```

### 自动迁移

系统启动时会自动检测并迁移旧数据：
1. 检测到旧表结构时，创建新表
2. 将旧数据转换为 JSON 格式并迁移到新表
3. 删除旧表，重命名新表
4. 重建索引

## WebSocket 数据推送机制

### 推送逻辑

服务端通过 `DataPushScheduler` 定期推送数据：

1. **定时触发**: 每隔 `PUSH_MESSAGE_INTERVAL` 秒执行一次
2. **数据查询**: 
   - 查询 `node_states` 表获取最新的节点健康状态
   - 查询 `metrics_data` 表获取最新的指标数据（按 timestamp DESC 排序取第一条）
3. **数据推送**: 通过 WebSocket 向该环境的所有连接客户端推送数据

### 消息类型

- `state_update`: 节点健康状态更新
- `metrics_update`: 节点指标数据更新
- `ping`: 心跳检测

### 示例消息

**状态更新消息:**
```json
{
  "type": "state_update",
  "envId": "env-123",
  "nodeId": "node-456",
  "data": {
    "status": "running",
    "lastCheckTime": "2024-01-20T10:30:00.000Z",
    "message": "Service is healthy"
  },
  "timestamp": "2024-01-20T10:30:05.000Z"
}
```

**指标更新消息:**
```json
{
  "type": "metrics_update",
  "envId": "env-123",
  "nodeId": "node-456",
  "data": [
    {
      "name": "cpu_usage",
      "value": 45.5,
      "unit": "%",
      "timestamp": "2024-01-20T10:30:00.000Z",
      "thresholdViolation": null
    }
  ],
  "timestamp": "2024-01-20T10:30:05.000Z"
}
```

## 启动说明

1. 安装依赖:
```bash
npm install
```

2. 配置环境变量:
```bash
cp .env.example .env
# 编辑 .env 文件，根据需要调整配置
```

3. 编译 TypeScript:
```bash
npm run build
```

4. 启动服务:
```bash
npm start
```

或开发模式:
```bash
npm run dev
```

## 新增文件

- `backend/.env`: 环境变量配置文件（不提交到 Git）
- `backend/.env.example`: 环境变量配置示例
- `backend/src/managers/DataPushScheduler.ts`: 数据推送调度器

## 修改文件

- `backend/src/database/init.ts`: 更新 metrics_data 表结构，添加自动迁移逻辑
- `backend/src/managers/DataCollector.ts`: 修改为将所有指标保存为单条 JSON 记录
- `backend/src/managers/WebSocketService.ts`: 添加环境变量支持
- `backend/src/index.ts`: 集成 DataPushScheduler，加载环境变量
- `backend/tsconfig.json`: 排除测试文件编译
- `backend/package.json`: 添加 dotenv 依赖
