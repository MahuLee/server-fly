# 运行服务监控应用

## 端口配置

### 后端服务器
- **默认端口**: `3001`
- **配置位置**: `backend/src/index.ts` 第16行
- **环境变量**: 可通过 `PORT` 环境变量覆盖

```typescript
const PORT = process.env.PORT || 3001;
```

### 前端开发服务器
- **默认端口**: `3000`
- **配置**: 由 `react-scripts` 自动配置
- **说明**: Create React App 默认使用 3000 端口

### WebSocket 服务器
- **端口**: `3002`
- **配置位置**: `backend/src/index.ts` 第895行
- **说明**: WebSocket 服务运行在独立端口

## 启动步骤

### 1. 启动后端服务器

```bash
# 进入后端目录
cd backend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

**预期输出**:
```
Database initialized successfully
HealthCheckScheduler started
WebSocket server started on port 3002
Server running on port 3001
```

**访问地址**:
- API 服务: http://localhost:3001
- 健康检查: http://localhost:3001/health
- WebSocket: ws://localhost:3002

### 2. 启动前端开发服务器

在新的终端窗口中：

```bash
# 进入前端目录
cd frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm start
```

**预期输出**:
```
Compiled successfully!

You can now view service-monitoring-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

**访问地址**:
- 前端应用: http://localhost:3000

### 3. 访问应用

在浏览器中打开: **http://localhost:3000**

## 端口冲突解决

### 如果 3000 端口被占用

前端会自动提示使用其他端口（如 3001），但这会与后端冲突。

**解决方案1**: 停止占用 3000 端口的进程

Windows:
```cmd
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F
```

**解决方案2**: 修改前端端口

创建 `frontend/.env` 文件：
```
PORT=3003
```

然后更新前端代码中的 API 地址（如果有硬编码）。

### 如果 3001 端口被占用

**解决方案1**: 停止占用 3001 端口的进程

**解决方案2**: 修改后端端口

设置环境变量：
```bash
# Windows CMD
set PORT=3005
npm run dev

# Windows PowerShell
$env:PORT=3005
npm run dev
```

然后更新前端代码中的 API 地址。

### 如果 3002 端口被占用

修改 `backend/src/index.ts` 第895行的 WebSocket 端口：
```typescript
webSocketService.start(3002); // 改为其他端口，如 3004
```

然后更新前端 WebSocket 连接地址（`frontend/src/services/WebSocketService.ts`）。

## API 端点配置

前端代码中硬编码了后端 API 地址。如果修改了后端端口，需要更新以下文件：

### 需要更新的文件

1. **前端 API 调用**
   - 搜索 `http://localhost:3001` 并替换为新地址
   - 主要文件: `frontend/src/components/*.tsx`

2. **WebSocket 连接**
   - 文件: `frontend/src/services/WebSocketService.ts`
   - 搜索 `ws://localhost:3002` 并替换

### 建议：使用环境变量

创建 `frontend/.env` 文件：
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3002
```

然后在代码中使用：
```typescript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3002';
```

## 生产环境部署

### 后端

```bash
cd backend
npm install --production
npm run build  # 如果有构建脚本
PORT=8080 node dist/index.js
```

### 前端

```bash
cd frontend
npm install
npm run build

# 使用静态文件服务器
npx serve -s build -p 80
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/build;
        try_files $uri /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

## 故障排查

### 前端无法连接后端

1. 检查后端是否正在运行: `curl http://localhost:3001/health`
2. 检查浏览器控制台的网络错误
3. 检查 CORS 配置（后端需要允许前端域名）

### WebSocket 连接失败

1. 检查 WebSocket 服务器是否启动
2. 检查浏览器控制台的 WebSocket 错误
3. 检查防火墙是否阻止了 3002 端口

### 数据库错误

1. 检查 `backend/data/` 目录是否存在
2. 检查数据库文件权限
3. 删除 `backend/data/monitoring.db` 重新初始化

## 开发模式 vs 生产模式

### 开发模式
- 前端: 热重载，开发服务器（3000）
- 后端: nodemon 自动重启（3001）
- 数据库: 本地 SQLite 文件

### 生产模式
- 前端: 构建后的静态文件，通过 Nginx 提供
- 后端: PM2 或 systemd 管理的 Node.js 进程
- 数据库: 持久化的 SQLite 文件或迁移到 PostgreSQL

## 常用命令

### 后端
```bash
npm run dev          # 开发模式（带自动重启）
npm start            # 生产模式
npm test             # 运行测试
npm run test:watch   # 监视模式运行测试
```

### 前端
```bash
npm start            # 开发服务器
npm run build        # 构建生产版本
npm test             # 运行测试
npm run test:watch   # 监视模式运行测试
```

## 性能优化建议

### 开发环境
- 使用 SSD 存储数据库文件
- 关闭不必要的浏览器扩展
- 使用 Chrome DevTools 的 Performance 面板分析性能

### 生产环境
- 启用 Gzip 压缩
- 使用 CDN 加速静态资源
- 配置 HTTP 缓存头
- 使用 PM2 集群模式运行多个后端实例
- 考虑使用 Redis 缓存频繁查询的数据
