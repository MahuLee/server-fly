# 架构图API更新说明

## 更新概述

更新了 `PUT /api/environments/:envId/graph` API，使其在更新 `graph_data` 表后，同步更新 `nodes`、`node_properties` 和 `edges` 表，确保数据库中的关系表与架构图数据保持一致。

## 数据库表结构更新

### 1. nodes 表
**新增字段：**
- `width REAL` - 节点宽度（对应前端 `properties.size[0]`）
- `height REAL` - 节点高度（对应前端 `properties.size[1]`）

### 2. node_properties 表
**新增字段：**
- `ip TEXT` - 服务器IP地址（对应前端 `properties.ip`）
- `port INTEGER` - 端口号（对应前端 `properties.port`）
- `username TEXT` - SSH用户名（对应前端 `properties.username`）
- `password TEXT` - SSH密码（对应前端 `properties.password`）
- `server_id TEXT` - 所属服务器ID（对应前端 `properties.serverId`）
- `resource_path TEXT` - 资源目录路径（对应前端 `properties.resourcePath`）

### 3. edges 表
**新增字段：**
- `source_handle TEXT` - 源节点连接点（对应前端 `sourceHandle`）
- `target_handle TEXT` - 目标节点连接点（对应前端 `targetHandle`）
- `animated INTEGER` - 是否动画（对应前端 `animated`，布尔值转整数）
- `marker_end TEXT` - 箭头标记（对应前端 `markerEnd`）

## API更新逻辑

### PUT /api/environments/:envId/graph

**更新流程：**

1. **验证环境存在**
   - 检查环境ID是否有效

2. **验证架构图数据**
   - 使用 `GraphDataModel.validate()` 验证数据格式

3. **更新 graph_data 表**
   - 序列化完整的架构图数据
   - 更新到 `graph_data` 表

4. **同步更新 nodes 表**
   - 获取数据库中现有节点ID列表
   - 删除前端已移除的节点（级联删除相关数据）
   - 对于每个前端节点：
     - 如果节点已存在：更新 `type`, `label`, `x`, `y`, `width`, `height`
     - 如果节点是新的：插入新记录，并创建初始 `node_states` 记录

5. **同步更新 node_properties 表**
   - 对于每个节点：
     - **智能填充 IP 地址**：
       - 服务器节点：使用自身的 `ip` 属性
       - 其他节点：如果有 `serverId`，自动从所属服务器获取 IP 地址
     - 序列化复杂对象（`healthCheck`, `metrics`, `actions`, `metadata`）
     - 如果属性记录已存在：更新所有字段
     - 如果属性记录不存在：插入新记录

6. **同步更新 edges 表**
   - 获取数据库中现有边ID列表
   - 删除前端已移除的边
   - 对于每个前端边：
     - 序列化 `style` 对象
     - 转换 `animated` 布尔值为整数（0/1）
     - 如果边已存在：更新所有字段
     - 如果边是新的：插入新记录

## 数据库迁移

添加了 `migrateDatabase()` 函数，在数据库初始化时自动检查并添加缺失的字段：

```typescript
function migrateDatabase() {
  // 检查 nodes 表并添加 width, height
  // 检查 node_properties 表并添加 ip, port, username, password, server_id, resource_path
  // 检查 edges 表并添加 source_handle, target_handle, animated, marker_end
}
```

**特点：**
- 自动检测现有表结构
- 只添加缺失的字段
- 不影响现有数据
- 向后兼容

## 前后端数据映射

### Node 数据映射

| 前端字段 | 数据库表 | 数据库字段 | 类型 | 说明 |
|---------|---------|-----------|------|------|
| `id` | nodes | id | TEXT | 节点唯一标识 |
| `type` | nodes | type | TEXT | 节点类型 |
| `label` | nodes | label | TEXT | 节点标签 |
| `x` | nodes | x | REAL | X坐标 |
| `y` | nodes | y | REAL | Y坐标 |
| `properties.size[0]` | nodes | width | REAL | 节点宽度 |
| `properties.size[1]` | nodes | height | REAL | 节点高度 |
| `properties.ip` | node_properties | ip | TEXT | **智能填充**：服务器节点使用自身IP，其他节点从所属服务器获取 |
| `properties.port` | node_properties | port | INTEGER | 端口号 |
| `properties.username` | node_properties | username | TEXT | SSH用户名 |
| `properties.password` | node_properties | password | TEXT | SSH密码 |
| `properties.serverId` | node_properties | server_id | TEXT | 所属服务器ID |
| `properties.resourcePath` | node_properties | resource_path | TEXT | 资源目录路径 |
| `properties.healthCheck` | node_properties | health_check | TEXT (JSON) | 健康检查配置 |
| `properties.metrics` | node_properties | metrics | TEXT (JSON) | 监控指标配置 |
| `properties.actions` | node_properties | actions | TEXT (JSON) | 操作配置 |
| `properties.metadata` | node_properties | metadata | TEXT (JSON) | 元数据 |

### Edge 数据映射

| 前端字段 | 数据库字段 | 类型 |
|---------|-----------|------|
| `id` | id | TEXT |
| `source` | source_id | TEXT |
| `target` | target_id | TEXT |
| `sourceHandle` | source_handle | TEXT |
| `targetHandle` | target_handle | TEXT |
| `label` | label | TEXT |
| `style` | style | TEXT (JSON) |
| `animated` | animated | INTEGER (0/1) |
| `markerEnd` | marker_end | TEXT |

## 使用示例

### 前端调用

```typescript
const saveGraphData = async (envId: string, data: GraphData) => {
  try {
    const response = await fetch(`http://localhost:3001/api/environments/${envId}/graph`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('架构图已保存，数据库已同步');
    }
  } catch (error) {
    console.error('保存失败:', error);
  }
};
```

### 数据格式示例

```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "server",
      "label": "Web服务器",
      "x": 100,
      "y": 100,
      "properties": {
        "ip": "192.168.1.100",
        "port": 22,
        "username": "admin",
        "password": "secret",
        "size": [200, 100],
        "healthCheck": {
          "type": "tcp",
          "interval": 30,
          "timeout": 5,
          "retries": 3
        },
        "metadata": {
          "description": "主Web服务器"
        }
      },
      "state": {
        "status": "running",
        "lastCheckTime": "2024-01-21T10:00:00Z"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "sourceHandle": "right",
      "targetHandle": "left",
      "label": "HTTP",
      "animated": true,
      "markerEnd": "arrow",
      "style": {
        "stroke": "#3b82f6",
        "strokeWidth": 2
      }
    }
  ]
}
```

## 优势

1. **数据一致性**：确保 `graph_data` 与关系表数据完全同步
2. **查询性能**：可以直接查询关系表，无需解析JSON
3. **关系完整性**：利用外键约束保证数据完整性
4. **向后兼容**：自动迁移现有数据库，不影响旧数据
5. **扩展性**：便于后续添加更多字段和功能

## 注意事项

1. **级联删除**：删除节点会自动删除相关的 `node_properties`、`node_states`、`metrics_data` 等
2. **事务安全**：所有更新操作在同一个请求中完成，保证原子性
3. **JSON序列化**：复杂对象（如 `healthCheck`、`style`）存储为JSON字符串
4. **空值处理**：可选字段使用 `null` 而不是空字符串
5. **布尔值转换**：SQLite不支持布尔类型，使用 INTEGER (0/1) 存储
6. **IP地址智能填充**：
   - 服务器节点：直接使用 `properties.ip`
   - 其他节点：如果有 `properties.serverId`，自动从所属服务器节点获取 IP 地址
   - 这样可以确保每个节点都有正确的 IP 地址用于健康检查和监控

## 测试建议

1. **创建新节点**：验证节点和属性是否正确插入
2. **更新节点**：验证节点和属性是否正确更新
3. **删除节点**：验证节点和相关数据是否正确删除
4. **创建边**：验证边是否正确插入
5. **更新边**：验证边属性是否正确更新
6. **删除边**：验证边是否正确删除
7. **数据迁移**：在旧数据库上测试迁移功能

## 相关文件

- `backend/src/index.ts` - API实现
- `backend/src/database/init.ts` - 数据库表结构和迁移
- `backend/src/types/index.ts` - 后端类型定义
- `frontend/src/types/index.ts` - 前端类型定义
- `frontend/src/App.tsx` - 前端API调用
