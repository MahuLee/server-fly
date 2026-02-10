# Server-Fly

一个功能强大且轻量化的服务监控应用，支持可视化架构图编辑、实时健康检查、WebSocket 实时推送和监控数据展示。

## ✨ 核心特性

- 🎨 **可视化架构图编辑** - 拖拽式设计，支持多种节点类型和自定义样式
- 🔍 **实时健康检查** - HTTP/TCP/SSH 脚本多种检查方式
- 📡 **WebSocket 实时推送** - 毫秒级状态更新，无需刷新页面
- 📊 **监控数据收集** - CPU、内存、磁盘等系统指标实时采集
- 🌍 **多环境管理** - 支持开发、测试、生产等多环境隔离
- 📝 **操作日志追踪** - 完整的操作历史记录和审计
- 🔄 **自动数据同步** - 架构图与数据库自动同步，保证数据一致性

## 项目结构

```
.
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── types/          # TypeScript 类型定义
│   │   ├── database/       # 数据库初始化和管理
│   │   ├── services/       # 业务逻辑服务
│   │   ├── routes/         # API 路由
│   │   └── index.ts        # 应用入口
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── types/          # TypeScript 类型定义
│   │   ├── components/     # React 组件
│   │   ├── services/       # API 服务
│   │   ├── App.tsx         # 主应用组件
│   │   └── index.tsx       # 应用入口
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
└── README.md
```

## 🛠️ 技术栈

### 后端
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Framework**: Express.js 4.x
- **Database**: SQLite (better-sqlite3)
- **WebSocket**: ws 8.x
- **Scheduling**: node-cron 3.x
- **SSH Client**: ssh2 1.x
- **Testing**: Jest + fast-check

### 前端
- **Framework**: React 18.x
- **Language**: TypeScript 5.x
- **Flow Diagram**: React Flow 11.x
- **UI Components**: 自定义组件库
- **HTTP Client**: Fetch API
- **WebSocket**: 原生 WebSocket API
- **Testing**: Jest + React Testing Library

### 数据库设计
- **环境管理**: environments
- **架构图**: graph_data, nodes, edges
- **节点配置**: node_properties
- **监控数据**: node_states, metrics_data
- **历史记录**: status_history, action_logs

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- 操作系统: Windows / macOS / Linux

### 安装步骤

#### 1. 克隆项目

```bash
git clone <repository-url>
cd server-fly
```

#### 2. 安装后端依赖

```bash
cd backend
npm install
```

#### 3. 配置后端环境变量（可选）

在 `backend` 目录下创建 `.env` 文件：

```env
# 服务器端口
PORT=3001

# 日志级别 (error, warn, info, debug)
LOG_LEVEL=info

# WebSocket 配置
WEBSOCKET_PING_INTERVAL=30

# 数据推送配置
PUSH_DEBOUNCE_MS=500
PUSH_HEARTBEAT_INTERVAL=30

# 数据清理配置
DATA_RETENTION_DAYS=30
CLEANUP_INTERVAL_HOURS=24
```

#### 4. 启动后端服务

```bash
npm run dev
```

后端服务器将在 **http://localhost:3001** 启动，WebSocket 服务同时启动。

#### 5. 安装前端依赖

```bash
cd ../frontend
npm install
```

#### 6. 配置前端环境变量（可选）

在 `frontend` 目录下创建 `.env` 文件：

```env
# 前端端口
PORT=3000

# API 地址（如果后端不在 localhost:3001）
REACT_APP_API_URL=http://localhost:3001
```

#### 7. 启动前端服务

```bash
npm start
```

前端应用将在 **http://localhost:3000** 启动并自动打开浏览器。

### 端口配置

| 服务 | 默认端口 | 说明 |
|------|---------|------|
| 前端 | 3000 | React 开发服务器 |
| 后端 API | 3001 | Express REST API |
| WebSocket | 3001 | WebSocket 服务（与 API 共用端口） |

**修改端口**: 
- 前端: 在 `frontend/.env` 中设置 `PORT=你的端口号`
- 后端: 在 `backend/.env` 中设置 `PORT=你的端口号`

详细配置请参考：
- [运行指南](RUNNING.md) - 完整的启动和部署说明
- [前端端口配置](frontend/PORT-CONFIG.md) - 详细的端口修改方法

### 验证安装

1. 访问 http://localhost:3000
2. 创建一个新环境（例如：开发环境）
3. 在"服务架构"视图中添加节点
4. 配置节点的健康检查
5. 切换到"监控一览"视图查看实时状态

## 💾 数据库

应用使用 SQLite 作为轻量级数据库，数据文件位于 `backend/data/monitoring.db`。

### 数据库表结构

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| `environments` | 环境配置 | id, name, description |
| `graph_data` | 架构图数据（JSON） | id, environment_id, data |
| `nodes` | 节点信息 | id, environment_id, type, label, x, y |
| `node_properties` | 节点属性 | id, node_id, ip, port, health_check, metrics |
| `node_states` | 节点状态 | id, node_id, status, last_check_time |
| `metrics_data` | 监控指标数据 | id, node_id, data, timestamp |
| `status_history` | 状态历史记录 | id, node_id, status, timestamp |
| `action_logs` | 操作日志 | id, node_id, action_name, result |
| `edges` | 架构图边 | id, environment_id, source_id, target_id |

### 数据库特性

- ✅ **自动迁移**: 启动时自动检测并添加缺失的字段
- ✅ **级联删除**: 删除节点时自动清理相关数据
- ✅ **数据同步**: 架构图更新时自动同步到关系表
- ✅ **事务支持**: 保证数据一致性

### 数据库管理

```bash
# 查看数据库文件
ls backend/data/monitoring.db

# 使用 SQLite 命令行工具
sqlite3 backend/data/monitoring.db

# 查看所有表
.tables

# 查看表结构
.schema nodes

# 退出
.quit
```

## 测试

### 后端测试

```bash
cd backend
npm test
npm run test:watch
```

### 前端测试

```bash
cd frontend
npm test
npm run test:watch
```

## 🎯 功能特性

### 1. 可视化架构图编辑

- **拖拽式设计**: 直观的拖拽操作，快速构建架构图
- **多种节点类型**: 
  - 服务器节点 (Server)
  - 服务节点 (Service)
  - 数据库节点 (Database)
  - 分组节点 (Group)
  - 文本节点 (Text)
  - 通用节点 (Generic)
- **自定义样式**: 节点大小、颜色、标签可自定义
- **灵活连线**: 支持多种连线样式和标注
- **实时保存**: 自动保存架构图到数据库

### 2. 智能配置管理

- **IP 地址自动填充**: 服务节点自动继承所属服务器的 IP 地址
- **健康检查配置**: 
  - HTTP 检查（支持自定义端点和状态码）
  - TCP 端口检查
  - SSH 脚本检查（支持远程执行）
- **监控指标配置**: CPU、内存、磁盘、网络等系统指标
- **控制操作配置**: 启动、停止、重启等远程操作
- **多环境管理**: 开发、测试、生产环境隔离

### 3. 实时监控系统

- **定期健康检查**: 
  - 可配置检查间隔（最小 10 秒）
  - 支持超时和重试机制
  - 自动记录检查结果
- **WebSocket 实时推送**: 
  - 毫秒级状态更新
  - 防抖机制避免频繁推送
  - 心跳检测保持连接
  - 自动重连机制
- **监控一览界面**: 
  - 实时显示所有节点状态
  - 状态颜色标识（正常/异常/警告/未知）
  - 连接状态指示器
  - 环境切换功能

### 4. 数据收集与展示

- **指标数据收集**: 
  - 通过 SSH 远程采集系统指标
  - 支持自定义采集脚本
  - 自动存储历史数据
- **状态历史记录**: 
  - 完整的状态变更历史
  - 支持时间范围查询
  - 统计分析功能
- **操作日志追踪**: 
  - 记录所有操作执行
  - 包含执行结果和输出
  - 支持审计和回溯

### 5. 数据同步机制

- **架构图同步**: 
  - 更新 `graph_data` 时自动同步到关系表
  - 同步 `nodes`、`node_properties`、`edges` 表
  - 级联删除保证数据一致性
- **健康检查同步**: 
  - 配置更新时自动注册/取消健康检查
  - 节点删除时自动清理检查任务
- **数据库自动迁移**: 
  - 启动时检测并添加缺失字段
  - 无需手动执行迁移脚本

## 📋 更新日志

### v2.1.0 (2026-02-09)

#### 🐛 Bug 修复
- **WebSocket 调试增强**: 添加详细的日志输出，便于排查推送问题
  - 添加 `[WS]` 前缀标识 WebSocket 相关日志
  - 添加 `[DataPush]` 前缀标识数据推送相关日志
  - 将关键日志级别从 DEBUG 提升到 INFO
  - 添加客户端连接状态检查
  - 添加消息发送大小统计

#### 📝 文档完善
- 完善 README.md，添加更详细的功能说明
- 添加 WebSocket 调试指南
- 添加常见问题解答

### v2.0.0 (2026-01-21)

#### 🎯 架构图 API 同步更新
- 更新 `graph_data` 后自动同步 `nodes`、`node_properties`、`edges` 表
- IP 地址智能填充（服务节点自动从服务器获取 IP）
- 数据库表结构完善（新增 width、height、ip、port 等字段）
- 数据库自动迁移功能

#### 📡 WebSocket 实时状态推送
- 后端通过 WebSocket 推送节点状态到前端
- 监控一览界面实时显示节点状态变化
- 连接状态指示器（实时监控中/连接已断开）
- 自动重连机制（最多5次尝试）
- 心跳检测（30秒间隔）
- 防抖机制（500ms）避免频繁推送

详细更新说明请查看：
- [项目更新总结](PROJECT_UPDATE_SUMMARY.md)
- [架构图 API 更新](ARCHITECTURE_API_UPDATE.md)
- [WebSocket 实时推送](WEBSOCKET_REALTIME_PUSH.md)
- [WebSocket 快速开始](WEBSOCKET_QUICKSTART.md)

## 测试功能

### 测试架构图 API

```bash
cd backend

# 测试基本 API 功能
node test-graph-api.js

# 测试 IP 智能填充
node test-ip-auto-fill.js
```

### 测试 WebSocket 推送

```bash
cd backend

# 测试 WebSocket 推送功能
node test-websocket-push.js
```

### 快速验证 WebSocket

1. 启动后端和前端服务
2. 创建环境和节点
3. 配置健康检查（间隔10秒）
4. 切换到"监控一览"界面
5. 观察连接状态和节点状态实时更新

详细步骤请查看 [WebSocket 快速开始指南](WEBSOCKET_QUICKSTART.md)

## 开发指南

### 添加新的 API 端点

1. 在 `backend/src/routes/` 中创建路由文件
2. 在 `backend/src/index.ts` 中注册路由
3. 编写相应的测试

### 添加新的前端组件

1. 在 `frontend/src/components/` 中创建组件
2. 在 `frontend/src/App.tsx` 中使用组件
3. 编写相应的测试

### 数据库迁移

数据库会在启动时自动检测并添加缺失的字段，无需手动迁移。

如需查看迁移逻辑，请参考 `backend/src/database/init.ts` 中的 `migrateDatabase()` 函数。

## 🐛 故障排查

### WebSocket 连接问题

#### 问题：前端显示"连接已断开"

**排查步骤：**

1. 检查后端服务是否正常运行
2. 检查浏览器控制台是否有 WebSocket 错误
3. 检查后端日志中的 WebSocket 连接信息

**解决方案：**

```bash
# 1. 检查后端日志
# 应该看到: "WebSocket server started"
# 应该看到: "Client xxx connected to environment xxx"

# 2. 检查前端控制台
# 应该看到: "WebSocket connected (global connection)"

# 3. 如果连接失败，检查端口是否被占用
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # macOS/Linux
```

#### 问题：WebSocket 连接正常但收不到数据

**排查步骤：**

1. 启用 DEBUG 日志级别
2. 检查是否有健康检查在执行
3. 检查是否有客户端连接

**解决方案：**

```bash
# 1. 在 backend/.env 中设置
LOG_LEVEL=debug

# 2. 重启后端服务，查看日志
# 应该看到:
# [INFO] [WS] broadcastStateUpdate: envId=xxx, nodeId=xxx, status=xxx
# [INFO] [WS] Broadcasted state_update to X/Y clients
# [INFO] [WS] Sent state_update: envId=xxx, nodeId=xxx, size=xxxB

# 3. 如果看到 "0/0 clients"，说明前端没有连接
# 如果看到 "0/1 clients"，说明客户端状态不是 OPEN

# 4. 检查前端控制台
# 应该看到:
# WebSocketService received message: state_update ...
# Processing state_update for nodeId: xxx
```

### 健康检查不执行

**排查步骤：**

1. 检查节点是否配置了健康检查
2. 检查健康检查配置是否正确
3. 检查后端日志

**解决方案：**

```bash
# 1. 检查后端日志
# 应该看到: "Health check registered for node xxx with interval xxxs"
# 应该看到: "-----健康检查----->node_id: xxx"

# 2. 如果没有看到注册信息，检查节点配置
# 在前端属性面板中确认健康检查配置已保存

# 3. 手动触发健康检查（用于测试）
curl -X POST http://localhost:3001/api/nodes/{nodeId}/health-check
```

### 数据库错误

**常见错误：**

1. `SQLITE_BUSY`: 数据库被锁定
2. `SQLITE_CONSTRAINT`: 约束违反（如外键约束）
3. `no such table`: 表不存在

**解决方案：**

```bash
# 1. 检查数据库文件是否存在
ls backend/data/monitoring.db

# 2. 如果数据库损坏，删除并重新创建
rm backend/data/monitoring.db
# 重启后端服务，会自动创建新数据库

# 3. 如果是外键约束错误，检查数据一致性
sqlite3 backend/data/monitoring.db
> PRAGMA foreign_keys = ON;
> PRAGMA foreign_key_check;
```

### 前端无法连接后端

**排查步骤：**

1. 检查后端是否启动
2. 检查端口是否正确
3. 检查 CORS 配置

**解决方案：**

```bash
# 1. 检查后端是否运行
curl http://localhost:3001/health
# 应该返回: {"status":"ok"}

# 2. 检查前端 API 配置
# frontend/src/config/api.ts
# 确认 API_BASE_URL 指向正确的后端地址

# 3. 检查浏览器控制台的网络请求
# 如果看到 CORS 错误，检查 backend/src/index.ts 中的 CORS 配置
```

## 📚 API 文档

### 环境管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/environments` | 获取所有环境 |
| POST | `/api/environments` | 创建环境 |
| GET | `/api/environments/:id` | 获取单个环境 |
| PUT | `/api/environments/:id` | 更新环境 |
| DELETE | `/api/environments/:id` | 删除环境 |

### 架构图管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/environments/:envId/graph` | 获取架构图 |
| PUT | `/api/environments/:envId/graph` | 更新架构图 |

### 节点状态

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/nodes/:nodeId/status/latest` | 获取最新状态 |
| GET | `/api/nodes/:nodeId/status/history` | 获取状态历史 |
| GET | `/api/nodes/:nodeId/status/stats` | 获取状态统计 |

### 监控数据

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/nodes/:nodeId/metrics/latest` | 获取最新指标 |
| GET | `/api/nodes/:nodeId/metrics/history` | 获取指标历史 |
| POST | `/api/nodes/:nodeId/metrics/collect` | 手动触发采集 |

### 操作执行

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/nodes/:nodeId/actions/:actionName` | 执行操作 |
| GET | `/api/nodes/:nodeId/actions/history` | 获取操作历史 |
| GET | `/api/actions/history` | 获取所有操作历史 |

### WebSocket

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/websocket/status` | 获取 WebSocket 状态 |

详细的 API 请求/响应示例请参考各个功能模块的文档。

## 🔧 开发指南

### 添加新的健康检查类型

1. 在 `backend/src/types/index.ts` 中扩展 `HealthCheckType`
2. 在 `HealthCheckScheduler.ts` 中实现检查逻辑
3. 在前端属性面板中添加配置选项

示例：

```typescript
// backend/src/types/index.ts
export type HealthCheckType = 'http' | 'tcp' | 'script' | 'ping';

// backend/src/managers/HealthCheckScheduler.ts
private async checkPing(nodeId: string, config: HealthCheckConfig): Promise<HealthCheckResult> {
  // 实现 ping 检查逻辑
}
```

### 添加新的监控指标

1. 在 `backend/src/types/index.ts` 中定义指标类型
2. 在 `DataCollector.ts` 中实现采集逻辑
3. 在前端监控面板中添加展示组件

### 自定义节点类型

1. 在 `frontend/src/components/nodes/` 中创建新节点组件
2. 在 `frontend/src/components/nodes/index.ts` 中导出
3. 在节点库中添加新节点类型

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/xxFeature`)
3. 提交更改 (`git commit -m 'Add some xxxFeature'`)
4. 推送到分支 (`git push origin feature/xxxFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 规则
- 编写单元测试
- 添加必要的注释
- 更新相关文档

### 提交信息规范

使用语义化提交信息：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat: 添加 WebSocket 实时推送功能
fix: 修复健康检查超时问题
docs: 完善 README 文档
```

## 📖 文档

### 其他文档

- [运行指南](RUNNING.md) - 完整的启动和部署说明
- [前端端口配置](frontend/PORT-CONFIG.md) - 端口修改方法

## ❓ 常见问题

### Q: 如何修改前端端口？

A: 在 `frontend` 目录下创建 `.env` 文件，添加 `PORT=你的端口号`。详见 [前端端口配置](frontend/PORT-CONFIG.md)。

### Q: WebSocket 连接不上怎么办？

A: 请检查：
1. 后端服务是否正常运行
2. 浏览器控制台是否有错误信息
3. 后端日志中是否有 WebSocket 相关错误
4. 参考上面的"故障排查"章节

### Q: 健康检查不执行怎么办？

A: 请确认：
1. 节点已配置健康检查
2. 健康检查配置正确（类型、间隔、端点等）
3. 后端日志中有"Health check registered"信息
4. 参考上面的"故障排查"章节

### Q: 如何查看数据库内容？

A: 使用 SQLite 命令行工具：
```bash
sqlite3 backend/data/monitoring.db
.tables
SELECT * FROM nodes;
```

### Q: 如何清理历史数据？

A: 系统会自动清理超过保留期的数据（默认30天）。也可以手动触发：
```bash
curl -X POST http://localhost:3001/api/admin/cleanup/manual
```

### Q: 支持哪些操作系统？

A: 支持 Windows、macOS 和 Linux。需要 Node.js 18+ 和 npm 9+。

### Q: 可以监控远程服务器吗？

A: 可以。通过配置节点的 IP、用户名、密码，支持通过 SSH 远程执行健康检查和指标采集。

### Q: 数据存储在哪里？

A: 所有数据存储在 SQLite 数据库中，位于 `backend/data/monitoring.db`。

## 📄 许可证

MIT License

Copyright (c) 2026 Service Monitoring Application

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**如有问题或建议，欢迎提交 Issue 或 Pull Request！** 🚀
