# WebSocket 实时状态推送功能说明

## 📌 功能概述

本功能实现了后端通过 WebSocket 将节点的实时状态推送到前端"监控一览"界面，让用户能够实时看到各个节点的健康状态变化。

---

## 🔄 工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     实时状态推送流程                              │
└─────────────────────────────────────────────────────────────────┘

1. 健康检查调度器 (HealthCheckScheduler)
   ↓
   定期执行节点健康检查
   ↓
2. 健康检查完成
   ↓
   更新节点状态到数据库 (node_states 表)
   ↓
3. 触发回调函数
   ↓
   调用 WebSocketService.broadcastStateUpdate()
   ↓
4. WebSocket 服务
   ↓
   推送状态更新到所有连接的客户端
   ↓
5. 前端接收更新
   ↓
   useWebSocket Hook 接收消息
   ↓
6. 更新 UI
   ↓
   MonitoringView 组件更新节点状态
   ↓
7. 用户看到实时状态变化 ✨
```

---

## 🏗️ 架构设计

### 后端组件

#### 1. WebSocketService (backend/src/managers/WebSocketService.ts)

**职责：**
- 管理 WebSocket 服务器
- 维护客户端连接
- 广播状态更新和指标更新

**核心方法：**
```typescript
// 启动 WebSocket 服务器
start(server: Server): void

// 广播状态更新到指定环境的所有客户端
broadcastStateUpdate(envId: string, nodeId: string, state: NodeState): void

// 广播指标更新到指定环境的所有客户端
broadcastMetricsUpdate(envId: string, nodeId: string, metrics: MetricData[]): void
```

#### 2. HealthCheckScheduler (backend/src/managers/HealthCheckScheduler.ts)

**职责：**
- 定期执行节点健康检查
- 健康检查完成后触发回调

**集成点：**
```typescript
// 在 backend/src/index.ts 中注册回调
healthCheckScheduler.onCheckComplete((nodeId, result) => {
  // 获取节点所属的环境ID
  const nodeResults = query(
    `SELECT environment_id FROM nodes WHERE id = ?`,
    [nodeId]
  );
  
  if (nodeResults.length > 0) {
    const envId = nodeResults[0].environment_id;
    // 广播状态更新
    webSocketService.broadcastStateUpdate(envId, nodeId, {
      status: result.status,
      lastCheckTime: result.timestamp,
      message: result.message
    });
  }
});
```

### 前端组件

#### 1. WebSocketService (frontend/src/services/WebSocketService.ts)

**职责：**
- 管理 WebSocket 客户端连接
- 接收并分发消息
- 自动重连机制

**核心方法：**
```typescript
// 连接到 WebSocket 服务器
connect(envId: string, wsUrl?: string): void

// 注册状态更新回调
onStateUpdate(callback: StateUpdateCallback): void

// 注册指标更新回调
onMetricsUpdate(callback: MetricsUpdateCallback): void
```

#### 2. useWebSocket Hook (frontend/src/hooks/useWebSocket.ts)

**职责：**
- 封装 WebSocket 连接逻辑
- 提供 React Hook 接口
- 管理连接生命周期

**使用方式：**
```typescript
const { isConnected, subscribeToStateUpdates, subscribeToMetricsUpdates } = 
  useWebSocket(envId);
```

#### 3. MonitoringView 组件 (frontend/src/components/MonitoringView.tsx)

**职责：**
- 显示监控一览界面
- 订阅实时状态更新
- 更新节点状态显示

**核心逻辑：**
```typescript
// 订阅实时状态更新
useEffect(() => {
  const unsubscribe = subscribeToStateUpdates((nodeId, state) => {
    // 更新节点状态
    setGraphData((prevData) => ({
      ...prevData,
      nodes: prevData.nodes.map((node) =>
        node.id === nodeId ? { ...node, state } : node
      )
    }));
  });
  
  return () => unsubscribe();
}, [subscribeToStateUpdates]);
```

---

## 📡 WebSocket 消息格式

### 消息类型

```typescript
type MessageType = 'state_update' | 'metrics_update' | 'ping' | 'pong';
```

### 消息结构

```typescript
interface WebSocketMessage {
  type: MessageType;
  envId?: string;
  nodeId?: string;
  data?: any;
  timestamp: string;
}
```

### 状态更新消息示例

```json
{
  "type": "state_update",
  "envId": "env-123",
  "nodeId": "node-456",
  "data": {
    "status": "running",
    "lastCheckTime": "2026-01-21T10:30:00Z",
    "message": "服务运行正常"
  },
  "timestamp": "2026-01-21T10:30:00Z"
}
```

### 指标更新消息示例

```json
{
  "type": "metrics_update",
  "envId": "env-123",
  "nodeId": "node-456",
  "data": [
    {
      "name": "cpu",
      "value": 45.5,
      "unit": "%",
      "timestamp": "2026-01-21T10:30:00Z"
    },
    {
      "name": "memory",
      "value": 2048,
      "unit": "MB",
      "timestamp": "2026-01-21T10:30:00Z"
    }
  ],
  "timestamp": "2026-01-21T10:30:00Z"
}
```

---

## 🎨 UI 状态显示

### 连接状态指示器

位置：监控一览界面右上角

**已连接状态：**
- 绿色圆点（带脉冲动画）
- 文字："实时监控中"

**断开连接状态：**
- 灰色圆点
- 文字："连接已断开"

### 节点状态显示

节点状态通过颜色和图标表示：

| 状态 | 颜色 | 说明 |
|------|------|------|
| running | 绿色 | 服务运行正常 |
| error | 红色 | 服务异常或无法连接 |
| warning | 黄色 | 服务有警告（如资源使用率高） |
| unknown | 灰色 | 状态未知或未检查 |

---

## 🔧 配置说明

### 后端配置

**WebSocket 端口：**
- 默认使用 HTTP 服务器的端口（3001）
- WebSocket 服务器与 HTTP 服务器共享端口

**心跳间隔：**
```typescript
// backend/src/managers/WebSocketService.ts
private startPingInterval(): void {
  this.pingInterval = setInterval(() => {
    // 发送心跳
  }, 30000); // 30秒
}
```

### 前端配置

**WebSocket URL：**
```typescript
// frontend/src/services/WebSocketService.ts
private getDefaultWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = process.env.REACT_APP_WS_PORT || '3001';
  return `${protocol}//${host}:${port}`;
}
```

**重连配置：**
```typescript
private maxReconnectAttempts: number = 3;
private reconnectDelay: number = 2000; // 2秒
```

---

## 🧪 测试方法

### 方法 1：使用测试脚本

```bash
cd backend
node test-websocket-push.js
```

测试脚本会：
1. 检查环境和节点配置
2. 验证 WebSocket 服务状态
3. 检查健康检查配置
4. 提供详细的验证步骤

### 方法 2：手动测试

**步骤：**

1. **启动后端服务**
```bash
cd backend
npm start
```

2. **启动前端应用**
```bash
cd frontend
npm start
```

3. **打开浏览器**
   - 访问 http://localhost:3000
   - 打开开发者工具 (F12)

4. **切换到监控一览**
   - 点击"监控一览"标签
   - 选择一个环境

5. **验证连接**
   - 查看右上角连接状态（应显示"实时监控中"）
   - 在 Network 标签中查看 WS 连接

6. **观察状态更新**
   - 等待健康检查执行（默认30秒间隔）
   - 观察节点状态颜色变化
   - 在 Console 中查看日志

### 方法 3：浏览器控制台验证

**查看 WebSocket 连接：**
```javascript
// 在浏览器控制台执行
// 查看 WebSocket 连接状态
console.log('WebSocket 连接:', window.webSocketService);
```

**查看接收到的消息：**
- 打开 Network 标签
- 选择 WS 过滤器
- 点击 WebSocket 连接
- 查看 Messages 标签

---

## 🐛 故障排查

### 问题 1：连接状态显示"连接已断开"

**可能原因：**
1. 后端服务未启动
2. WebSocket 端口不正确
3. 防火墙阻止连接

**解决方法：**
```bash
# 检查后端服务
curl http://localhost:3001/health

# 检查 WebSocket 状态
curl http://localhost:3001/api/websocket/status
```

### 问题 2：节点状态不更新

**可能原因：**
1. 节点未配置健康检查
2. 健康检查调度器未启动
3. WebSocket 消息未正确广播

**解决方法：**
1. 检查节点的健康检查配置
2. 查看后端日志中的健康检查执行记录
3. 查看后端日志中的 WebSocket 广播记录

### 问题 3：浏览器控制台报错

**常见错误：**

```
WebSocket connection failed
```
**解决：** 检查后端服务是否运行，端口是否正确

```
WebSocket is already connected
```
**解决：** 正常情况，表示已经连接

### 问题 4：状态更新延迟

**可能原因：**
- 健康检查间隔较长（默认30秒）

**解决方法：**
- 调整节点的健康检查间隔配置
- 在节点属性中设置更短的 `interval` 值

---

## 📊 性能考虑

### 连接管理

- 每个环境维护独立的客户端连接
- 切换环境时自动断开旧连接，建立新连接
- 支持多个客户端同时连接同一环境

### 消息广播

- 只向订阅了特定环境的客户端推送消息
- 使用环境ID过滤，避免不必要的消息传输

### 心跳机制

- 每30秒发送一次心跳
- 检测并清理断开的连接
- 客户端自动响应心跳

---

## 🚀 未来优化

### 短期优化

1. **消息压缩**
   - 对大量数据使用压缩
   - 减少网络传输

2. **批量更新**
   - 合并短时间内的多个更新
   - 减少消息数量

3. **断线重连优化**
   - 增加指数退避策略
   - 断线后自动同步状态

### 长期优化

1. **消息队列**
   - 使用 Redis 等消息队列
   - 支持分布式部署

2. **状态持久化**
   - 客户端断线期间的状态变化
   - 重连后自动同步

3. **性能监控**
   - WebSocket 连接数监控
   - 消息延迟监控
   - 带宽使用监控

---

## 📝 相关文件

### 后端文件
- `backend/src/managers/WebSocketService.ts` - WebSocket 服务
- `backend/src/managers/HealthCheckScheduler.ts` - 健康检查调度器
- `backend/src/index.ts` - 服务器入口，集成 WebSocket

### 前端文件
- `frontend/src/services/WebSocketService.ts` - WebSocket 客户端
- `frontend/src/hooks/useWebSocket.ts` - WebSocket Hook
- `frontend/src/components/MonitoringView.tsx` - 监控一览组件
- `frontend/src/components/MonitoringView.css` - 监控一览样式

### 测试文件
- `backend/test-websocket-push.js` - WebSocket 推送测试脚本

---

## 💡 使用建议

1. **配置健康检查**
   - 为每个节点配置合适的健康检查
   - 设置合理的检查间隔（建议30-60秒）

2. **监控连接状态**
   - 注意右上角的连接状态指示器
   - 断开时及时检查网络和服务

3. **查看详细信息**
   - 双击节点查看详细状态
   - 查看历史状态变化

4. **性能优化**
   - 避免过短的健康检查间隔
   - 合理配置节点数量

---

**更新日期**: 2026-01-21  
**版本**: 1.0.0  
**状态**: ✅ 已完成并测试
