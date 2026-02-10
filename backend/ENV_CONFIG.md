# 环境变量配置说明

## 📋 配置文件位置

- **`.env`** - 实际使用的配置文件（不提交到 Git）
- **`.env.example`** - 配置示例文件（提交到 Git）

## 🔧 必需配置项

以下配置项是服务器运行所必需的：

```env
# 服务器端口
PORT=3001

# WebSocket 心跳间隔（秒）
WEBSOCKET_PING_INTERVAL=30

# 数据推送防抖延迟（毫秒）
PUSH_DEBOUNCE_MS=500

# 数据推送心跳间隔（秒）
PUSH_HEARTBEAT_INTERVAL=30
```

## 📝 完整配置项列表

### 1. 服务器配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3001 | 后端 API 服务器的 HTTP 端口 |

### 2. WebSocket 配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `WEBSOCKET_PING_INTERVAL` | 30 | WebSocket 心跳检测间隔（秒） |

### 3. 数据推送配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `PUSH_DEBOUNCE_MS` | 500 | 防抖延迟（毫秒），短时间内多次更新会合并 |
| `PUSH_HEARTBEAT_INTERVAL` | 30 | 心跳间隔（秒），长时间无更新时推送所有节点状态 |

### 4. 数据库配置（可选）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `DB_PATH` | data/monitoring.db | SQLite 数据库文件路径 |
| `DB_POOL_SIZE` | 10 | 数据库连接池大小 |

### 5. 健康检查配置（可选）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `HEALTH_CHECK_INTERVAL` | 30 | 默认健康检查间隔（秒） |
| `HEALTH_CHECK_TIMEOUT` | 5 | 默认健康检查超时（秒） |
| `HEALTH_CHECK_RETRIES` | 3 | 默认健康检查重试次数 |

### 6. 指标收集配置（可选）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `METRICS_COLLECTION_INTERVAL` | 60 | 默认指标收集间隔（秒） |
| `DATA_RETENTION_DAYS` | 30 | 指标数据保留天数 |

### 7. 日志配置（可选）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `LOG_LEVEL` | info | 日志级别：`error`（仅错误）、`warn`（警告+错误）、`info`（信息+警告+错误）、`debug`（全部日志） |
| `VERBOSE_LOGGING` | false | 是否启用详细日志 |

**日志级别说明：**
- `error`: 仅输出错误信息，适用于生产环境
- `warn`: 输出警告和错误信息
- `info`: 输出一般信息、警告和错误（默认，推荐）
- `debug`: 输出所有日志，包括调试信息，适用于开发和调试

### 8. 数据保留配置（可选）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `DATA_RETENTION_DAYS` | 3 | 时序数据保留天数，超过该天数的数据将在每日凌晨 2:00 自动清理 |

**清理的数据表：**
- `metrics_data` - 指标数据
- `status_history` - 状态历史
- `node_states` - 节点状态（长时间未更新的）
- `action_logs` - 操作日志

### 8. CORS 配置（可选）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `CORS_ORIGINS` | http://localhost:3000,http://localhost:3003 | 允许的前端地址（逗号分隔） |

### 9. 性能配置（可选）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `REQUEST_TIMEOUT` | 30000 | HTTP 请求超时时间（毫秒） |

### 10. 安全配置（可选）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `API_KEY` | - | API 密钥（如果设置，客户端需要提供） |
| `ENABLE_HTTPS` | false | 是否启用 HTTPS |
| `SSL_CERT_PATH` | - | SSL 证书路径 |
| `SSL_KEY_PATH` | - | SSL 密钥路径 |

### 11. 开发/调试配置（可选）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `DEV_MODE` | false | 开发模式（输出更多调试信息） |
| `MOCK_DATA` | false | 模拟数据模式（不进行真实检查） |

## 🎯 推荐配置

### 高实时性场景（监控告警）

```env
PORT=3001
WEBSOCKET_PING_INTERVAL=20
PUSH_DEBOUNCE_MS=200
PUSH_HEARTBEAT_INTERVAL=60
```

### 平衡场景（常规监控）

```env
PORT=3001
WEBSOCKET_PING_INTERVAL=30
PUSH_DEBOUNCE_MS=500
PUSH_HEARTBEAT_INTERVAL=30
```

### 低频场景（历史数据）

```env
PORT=3001
WEBSOCKET_PING_INTERVAL=60
PUSH_DEBOUNCE_MS=1000
PUSH_HEARTBEAT_INTERVAL=120
```

## 🚀 快速开始

1. **复制配置文件**
   ```bash
   cp .env.example .env
   ```

2. **编辑配置**
   ```bash
   # 使用你喜欢的编辑器打开 .env
   nano .env
   # 或
   code .env
   ```

3. **修改必需配置**
   - 根据需要修改 `PORT`
   - 调整 `PUSH_DEBOUNCE_MS` 和 `PUSH_HEARTBEAT_INTERVAL`

4. **启动服务**
   ```bash
   npm start
   ```

## ⚠️ 注意事项

1. **编码格式**
   - 配置文件必须使用 UTF-8 编码
   - 避免使用 BOM（Byte Order Mark）

2. **配置优先级**
   - `.env` 文件中的配置 > 默认值
   - 环境变量 > `.env` 文件

3. **配置生效**
   - 修改配置后需要重启服务
   - 某些配置可能需要清空数据库

4. **安全性**
   - 不要将 `.env` 文件提交到版本控制系统
   - 生产环境应使用环境变量而非 `.env` 文件
   - 敏感信息（如 API_KEY）应妥善保管

5. **配置验证**
   - 启动时会验证配置的有效性
   - 无效的配置会使用默认值并输出警告

## 🔍 配置调优建议

### 防抖延迟（PUSH_DEBOUNCE_MS）

- **值越小**：实时性越好，但推送频率越高
- **值越大**：性能越好，但实时性略差
- **推荐范围**：200-1000ms

### 心跳间隔（PUSH_HEARTBEAT_INTERVAL）

- **值越小**：数据同步越及时，但网络流量越大
- **值越大**：网络流量越小，但数据可能不够新鲜
- **推荐范围**：30-120 秒

### WebSocket 心跳（WEBSOCKET_PING_INTERVAL）

- **值越小**：连接检测越及时，但开销越大
- **值越大**：开销越小，但可能延迟发现断线
- **推荐范围**：20-60 秒

## 📊 性能影响

| 配置 | 实时性 | 性能 | 网络流量 |
|------|--------|------|----------|
| PUSH_DEBOUNCE_MS=200 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| PUSH_DEBOUNCE_MS=500 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| PUSH_DEBOUNCE_MS=1000 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |

## 🐛 故障排查

### 问题：配置不生效

**解决方案：**
1. 检查 `.env` 文件是否存在
2. 检查文件编码是否为 UTF-8
3. 检查配置项名称是否正确
4. 重启服务

### 问题：中文注释乱码

**解决方案：**
1. 确保文件使用 UTF-8 编码保存
2. 使用支持 UTF-8 的编辑器
3. 避免使用 Windows 记事本

### 问题：推送延迟过高

**解决方案：**
1. 减小 `PUSH_DEBOUNCE_MS` 值
2. 检查网络连接
3. 检查服务器性能

### 问题：推送频率过高

**解决方案：**
1. 增大 `PUSH_DEBOUNCE_MS` 值
2. 增大 `PUSH_HEARTBEAT_INTERVAL` 值
3. 检查健康检查和指标收集的间隔配置

## 📚 相关文档

- [CONFIGURATION.md](./CONFIGURATION.md) - 详细配置说明
- [PUSH_STRATEGY.md](./PUSH_STRATEGY.md) - 推送策略详解
- [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) - 优化总结

## 💡 最佳实践

1. **开发环境**
   - 使用 `.env` 文件
   - 启用 `DEV_MODE` 和 `VERBOSE_LOGGING`
   - 使用较小的间隔值以便测试

2. **生产环境**
   - 使用环境变量而非 `.env` 文件
   - 禁用 `DEV_MODE` 和 `VERBOSE_LOGGING`
   - 根据实际负载调优配置

3. **配置管理**
   - 使用版本控制管理 `.env.example`
   - 不要提交 `.env` 到版本控制
   - 为不同环境准备不同的配置模板

4. **监控和调优**
   - 监控推送频率和延迟
   - 根据实际情况调整配置
   - 定期检查日志和性能指标
