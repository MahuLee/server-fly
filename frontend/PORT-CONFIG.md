# 前端端口配置指南

## 修改前端默认端口

前端使用 Create React App (react-scripts)，默认端口是 **3000**。

### 方法1：使用 .env 文件（推荐）

1. 在 `frontend` 目录下创建 `.env` 文件：

```bash
# 在 frontend 目录下
touch .env
```

2. 在 `.env` 文件中设置端口：

```env
PORT=3003
```

3. 启动开发服务器：

```bash
npm start
```

前端将在 **http://localhost:3003** 启动

**优点**:
- ✅ 配置持久化
- ✅ 团队成员可以有不同的本地配置
- ✅ `.env` 文件已在 `.gitignore` 中，不会被提交

### 方法2：命令行参数（临时）

#### Windows CMD
```cmd
set PORT=3003 && npm start
```

#### Windows PowerShell
```powershell
$env:PORT=3003; npm start
```

#### Linux/Mac
```bash
PORT=3003 npm start
```

**优点**:
- ✅ 快速临时修改
- ✅ 不需要创建文件

**缺点**:
- ❌ 每次启动都需要设置
- ❌ 不持久化

### 方法3：修改 package.json（不推荐）

修改 `frontend/package.json` 的 scripts 部分：

#### Windows
```json
{
  "scripts": {
    "start": "set PORT=3003 && react-scripts start"
  }
}
```

#### Linux/Mac
```json
{
  "scripts": {
    "start": "PORT=3003 react-scripts start"
  }
}
```

#### 跨平台（使用 cross-env）
```bash
npm install --save-dev cross-env
```

```json
{
  "scripts": {
    "start": "cross-env PORT=3003 react-scripts start"
  }
}
```

**缺点**:
- ❌ 会被提交到 Git
- ❌ 影响所有团队成员
- ❌ 不灵活

## 端口冲突处理

### 自动选择其他端口

如果 3000 端口被占用，Create React App 会自动提示：

```
? Something is already running on port 3000.

Would you like to run the app on another port instead? › (Y/n)
```

选择 `Y` 会自动使用下一个可用端口（通常是 3001）。

### 查找占用端口的进程

#### Windows
```cmd
# 查找占用 3000 端口的进程
netstat -ano | findstr :3000

# 结束进程（替换 <PID> 为实际进程ID）
taskkill /PID <PID> /F
```

#### Linux/Mac
```bash
# 查找占用 3000 端口的进程
lsof -i :3000

# 结束进程（替换 <PID> 为实际进程ID）
kill -9 <PID>
```

## 配置 API 和 WebSocket 地址

如果修改了后端端口，也需要更新前端的 API 和 WebSocket 地址。

### 使用环境变量（推荐）

在 `.env` 文件中添加：

```env
# 前端端口
PORT=3003

# 后端 API 地址
REACT_APP_API_URL=http://localhost:3001

# WebSocket 地址
REACT_APP_WS_URL=ws://localhost:3002
```

### 在代码中使用环境变量

目前前端代码中硬编码了 API 地址。建议修改为使用环境变量：

#### 示例：API 调用
```typescript
// 不推荐：硬编码
const response = await fetch('http://localhost:3001/api/environments');

// 推荐：使用环境变量
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const response = await fetch(`${API_URL}/api/environments`);
```

#### 示例：WebSocket 连接
```typescript
// 不推荐：硬编码
this.ws = new WebSocket('ws://localhost:3002');

// 推荐：使用环境变量
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3002';
this.ws = new WebSocket(WS_URL);
```

## 环境变量说明

Create React App 支持的环境变量：

### 内置变量
- `PORT` - 开发服务器端口（默认 3000）
- `BROWSER` - 自动打开的浏览器（默认系统默认浏览器）
- `BROWSER_ARGS` - 浏览器启动参数
- `HOST` - 开发服务器主机（默认 localhost）

### 自定义变量
- 必须以 `REACT_APP_` 开头
- 在代码中通过 `process.env.REACT_APP_XXX` 访问
- 在构建时会被替换为实际值

### 环境文件优先级
1. `.env.local` - 本地覆盖（所有环境）
2. `.env.development.local` - 本地覆盖（开发环境）
3. `.env.development` - 开发环境
4. `.env` - 所有环境的默认值

## 生产环境配置

### 构建时设置环境变量

```bash
# Windows CMD
set REACT_APP_API_URL=https://api.example.com && npm run build

# Windows PowerShell
$env:REACT_APP_API_URL="https://api.example.com"; npm run build

# Linux/Mac
REACT_APP_API_URL=https://api.example.com npm run build
```

### 使用 .env.production

创建 `frontend/.env.production` 文件：

```env
REACT_APP_API_URL=https://api.example.com
REACT_APP_WS_URL=wss://api.example.com/ws
```

运行 `npm run build` 时会自动使用这些值。

## 故障排查

### 端口修改不生效

1. **清除缓存**
   ```bash
   # 删除 node_modules/.cache
   rm -rf node_modules/.cache
   
   # 重新启动
   npm start
   ```

2. **检查环境变量**
   ```bash
   # 在启动脚本中添加 echo
   echo $PORT  # Linux/Mac
   echo %PORT%  # Windows CMD
   ```

3. **检查 .env 文件格式**
   - 确保没有空格：`PORT=3003`（正确）
   - 不要有引号：`PORT="3003"`（错误）
   - 不要有注释在同一行：`PORT=3003 # 端口`（错误）

### 浏览器自动打开错误的端口

设置 `BROWSER=none` 禁用自动打开：

```env
PORT=3003
BROWSER=none
```

然后手动在浏览器中打开 http://localhost:3003

## 推荐配置

### 开发环境 (.env)
```env
# 前端端口（避免与后端 3001 冲突）
PORT=3000

# 后端 API
REACT_APP_API_URL=http://localhost:3001

# WebSocket
REACT_APP_WS_URL=ws://localhost:3002

# 禁用自动打开浏览器（可选）
# BROWSER=none
```

### 生产环境 (.env.production)
```env
# 生产环境 API（使用 HTTPS）
REACT_APP_API_URL=https://api.yourdomain.com

# 生产环境 WebSocket（使用 WSS）
REACT_APP_WS_URL=wss://api.yourdomain.com/ws
```

## 快速参考

| 需求 | 命令/配置 |
|------|----------|
| 修改为 3003 端口 | 创建 `.env`，添加 `PORT=3003` |
| 临时使用 3005 端口 | `PORT=3005 npm start` |
| 禁用自动打开浏览器 | `.env` 中添加 `BROWSER=none` |
| 配置生产 API | 创建 `.env.production` |
| 查看当前端口 | 启动时查看控制台输出 |

## 相关文档

- [Create React App - 环境变量](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Create React App - 高级配置](https://create-react-app.dev/docs/advanced-configuration/)
- [项目运行指南](../RUNNING.md)
