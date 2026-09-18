# ServerFLY 前端 Apple 风格改造

## 摘要

把 `frontend` 的展示层从「科技黑 / 简约白」双主题整体替换为 **Apple 浅色（默认）+ Apple 深色** 双主题，覆盖全应用（外壳、图编辑器画布与节点、监控视图与图表、抽屉/弹窗/提示）。移除 Orbitron/发光/渐变/扫描线等科技感装饰，改用 Apple 系统字体栈、`#f5f5f7`/纯白卡片、柔和阴影、pill 主按钮、`#0071e3` 蓝色强调。动效与图标按 `emil-design-eng` 原则重新打磨。

**纯展示层改造**：不改动 `GraphData` / `Node` / WebSocket / REST 契约，不改类名，不新增依赖。

## 关键变更

### 1. 主题系统重构（核心，最大收益）

- 主题 ID：`tech-dark` → `apple-dark`，`minimalist` → `apple-light`；默认 `apple-light`。
- **浅色调色板写在 `:root`，深色只在 `[data-theme="apple-dark"]` 覆盖**，未设置属性时也能正确渲染。
- 删除全站 ~16 个 CSS 文件里的 `[data-theme="tech-dark"]` / `[data-theme="minimalist"]` 装饰性覆盖块（发光、渐变、`backdrop-filter` 强化、Orbitron）。基础规则本就用 `var(--*)`，删除后自动继承新变量 —— **这是本次改动主要是"删 CSS"的原因**。
- 变量沿用现有名字（`--gradient-primary`、`--glow-primary` 等）但**值改为扁平/柔和值**，未触及的规则自动降级为 Apple 观感，无需逐个文件改写。

**浅色**：`bg #f5f5f7 / 卡片 #fff`、`text #1d1d1f / #6e6e73 / #86868b`、`border rgba(0,0,0,.09)`、`primary #0071e3`、`success #34c759`、`warning #ff9f0a`、`error #ff3b30`、圆角 `6/10/16px` + `--border-radius-pill: 980px`。

**深色**：`bg #000 / 卡片 #1d1d1f`、`text #f5f5f7 / #a1a1a6`、`border rgba(255,255,255,.14)`、`primary #0a84ff`、`success #30d158`、`warning #ffd60a`、`error #ff453a`。

新增 `--tint-success/-warning/-error/-neutral`、`--glass-bg`、`--separator`，替代节点状态与导航栏里的硬编码 `rgba()`（避免用 `color-mix()`，规避 CRA postcss 风险）。

### 2. 字体与基础层

- 删除 `index.css` 的 Google Fonts `@import`（Orbitron/Poppins/Quicksand），改为系统栈：
  `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', sans-serif`。零网络依赖。
- 标题用 `font-weight: 600`、`letter-spacing: -0.01em`、纯色（`.gradient-text` 改为单色）。移除 `.tech-font`。
- 滚动条改为中性细滚动条（`rgba(0,0,0,.2)` / `rgba(255,255,255,.24)`，宽 8px），去掉彩色渐变轨道。
- `public/index.html`：`theme-color` 改为 `#f5f5f7`（附 `prefers-color-scheme: dark` 变体）、`lang="zh-CN"`。

### 3. 动效重做（按 emil-design-eng）

在 `themes.css` 建立动效 token：

```
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--duration-press: 120ms; --duration-fast: 160ms;
--duration-base: 220ms;  --duration-drawer: 320ms;
```

| Before | After | Why |
| --- | --- | --- |
| `transition: all 0.3s ease`（全站 40+ 处） | 按用途列出精确属性 + `var(--ease-out)` | `all` 会连带触发布局与重绘属性 |
| 抽屉动画 `right: -500px → 0`（`.property-drawer` / `.edge-style-drawer` / `.metrics-detail-drawer`） | `transform: translateX(100%) → translateX(0)` | 只动合成属性，不走布局 |
| 抽屉开合同速 0.3s | 开 `320ms var(--ease-drawer)`，关 `200ms var(--ease-out)` | 进入从容、退出干脆 |
| 按钮无按压反馈 | `:active { transform: scale(0.97) }`，`transform 120ms var(--ease-out)` | 界面"听得到"用户 |
| 下拉/右键菜单 `fadeIn` keyframes | `opacity + scale(0.97)` 过渡，150ms，`transform-origin: top left` | keyframes 被打断会从零重放；浮层应从触发器展开 |
| 无 `transform-origin` 的 tooltip | `scale(0.97) → 1`，150ms，origin `top center` | 避免"凭空出现" |
| 状态点 `animation: pulse infinite`（每个节点都有） | 静态圆点 | 数十个元素常驻动画是噪音与开销 |
| `.empty-workspace::before` / 图标 `float` / `bounce` | 静态 | 同上 |
| `.sidebar-container` 的 `transition: all` | 仅 `width 240ms var(--ease-out)` | 折叠 flex 侧栏必须动宽，收窄为单一属性 |
| 无 reduced-motion 处理 | 全局 `@media (prefers-reduced-motion: reduce)`：禁用 transform 位移与 keyframes，保留 opacity/color | 可访问性 |
| hover 位移无媒体查询 | 包 `@media (hover: hover) and (pointer: fine)` | 触屏 tap 会误触发 hover |
| 列表同时出现 | `.menu-item` / `.environment-item` / `.node-library-item` 30ms 步进 stagger（上限 8 项），`opacity:0 + translateY(6px)` → 正常，240ms | 级联比齐现自然 |
| 主题切换无过渡 | 保留全局 `background-color/border-color/color` 200ms（**去掉 box-shadow**） | 切换需要连贯，但阴影过渡昂贵 |

删除的 keyframes/特效：`scan`、`gridMove`、`freshGradient`、`vibrantPulse`、`float`、`bounce`、`tech-glow`、`scan-line`、`ripple`、`vibrant-pulse`、`fresh-bg`、`minimalist-card`。仅保留连接心跳所需的动画与 `spin`。

### 4. 图标（emoji → 单色线性 SVG）

新增 `src/components/icons/index.tsx`：约 18 个 stroke 图标，统一 `stroke="currentColor"` `strokeWidth={1.5}` `strokeLinecap="round"` `aria-hidden="true"`，尺寸按场景 16/18/20px，空状态 72px + `strokeWidth={1}`，默认色 `currentColor`，面板标题/空状态用 `var(--color-primary)`。
清单：`MonitorIcon LayersIcon DocIcon BellIcon GlobeIcon SearchIcon RocketIcon WrenchIcon SaveIcon ImportIcon ExportIcon RefreshIcon ServerIcon ServiceIcon DatabaseIcon CacheIcon QueueIcon GatewayIcon BalanceIcon BoxIcon FolderIcon TextIcon CloseIcon SettingsIcon ChevronLeftIcon ChevronRightIcon`。

接线点：
- `src/config/menuItems.ts` → **改名为 `menuItems.tsx`**，`MenuItem.icon` 类型 `string` → `React.ReactNode`；`MainMenu.tsx` 的 `MenuItem` 同步。
- `Toolbar.tsx`：`💾 📥 📤 🔄` → 图标组件。
- `NodeLibrary.tsx`：`NODE_TYPES[].icon` → `React.ReactNode`。
- `PropertyDrawer.tsx`：`✕` → `CloseIcon`；`⚙️ 阈值配置` → `SettingsIcon`。
- 删除 CSS 伪元素 emoji 并在 JSX 内渲染图标：`.environment-selector-header h3::before 🌍`、`.node-library-header h3::before 📦`、`.empty-workspace::before 🚀`、`.empty-state::before 📊`、`.empty-graph-state::before 🔍`；`UnderDevelopmentView` 的 `🚧` 换 `WrenchIcon`。
- 图标在 `App.css` / 各面板 CSS 内统一继承 `--color-primary` 或 `--text-secondary`，不再有彩色投影滤镜。

### 5. 分区样式

- **导航栏**：Apple nav-bar —— 高 48px、`background: var(--glass-bg)`、`backdrop-filter: saturate(180%) blur(20px)`、底部 1px `--separator` 细线、去掉渐变与发光。`ServerFLY` 用纯色 600 字重。
- **主题开关**：`.theme-switch` 改为真 `<button role="switch" aria-checked aria-label="切换深色外观">`；滑块 120ms `--ease-out`，标签「浅色 / 深色」。
- **主菜单**：`.menu-item` 去 Orbitron 与底部渐变条，active 用 `--color-primary` 文字 + 2px 下划线，hover 用 `--bg-hover`。
- **工具栏/按钮**：主操作按钮 pill（`--border-radius-pill`，Apple 竖向微渐变 `#0077ed → #0071e3`），次级按钮 `--border-radius-md`；`--glow-*` 变为 focus 光环 `0 0 0 3px rgba(0,113,227,.25)`；补 `:focus-visible` 可见焦点环。
- **节点库 / 环境列表 / 抽屉 / 弹窗**：白卡 + 1px 细边 + `--card-shadow`，圆角 10–16px；删除 `--gradient-card` 上的彩色描边伪元素。
- **画布**：删除 `GraphCanvas.css` 里与 `<Background variant={Dots} gap={15} />` 重复的 `.graph-canvas-container::before` 网格；网格点色改 `--grid-color`；`react-flow__controls` 用白卡 + 细边；`.graph-toolbar` / `.toolbar-btn` 里遗留的 `#fafafa` / `#1890ff` 全部换成变量。
- **节点**：`NodeStyles.css` 圆角 10px、1px 细边、柔和阴影、无发光；选中态 2px `--color-primary` 环；状态背景由粗渐变改为 `--tint-*` 淡色；状态点 8px 静态。`ServerNode.tsx` / `GroupNode.tsx` 内联 `rgba(150,150,150,.3)` 换成 `var(--border-secondary)`。`CustomEdge.tsx` 的 `#4a90e2` / `#10b981` 换成 `var(--color-primary)` / `var(--color-success)`。
- **监控面板**：`MonitoringPanel.css` 内 `#fff #fafafa #262626 #8c8c8c #1890ff #faad14 #ff4d4f` 全部变量化（该文件目前完全不受主题控制）。
- **App.tsx**：`Theme` 类型与初始值、切换逻辑、Toaster 样式（Apple 白卡/深卡 + 柔和阴影）、心跳 SVG 的 `rgba(20,27,58,.6)` 改用 `stroke="var(--bg-secondary)"`，绿/红换 `#34c759` / `#ff3b30`。

### 6. 图表配色

新增 `src/config/chartTheme.ts`，导出单个 `CHART_COLORS`（蓝线 `#0071e3`、半透明填充、中性网格 `rgba(128,128,128,.2)`、轴文字 `#86868b`）。`MonitoringPanel.tsx`（`rgb(75,192,192)`）与 `MetricsDetailDrawer.tsx`（`#ff4d4f #faad14 #1890ff #8c8c8c`）改为引用它。

`ponytail:` 图表配色不跟随主题实时切换 —— `theme` 状态在 `App` 且未下传监控子树，做响应式会引入 context 与重渲染管道；选的这组中性色在浅/深底上都成立。若日后需要，把它包一层订阅主题的组件即可。

## 涉及文件（按区域）

| 区域 | 文件 |
| --- | --- |
| 主题核心 | `src/themes.css`（重写）、`src/index.css`、`public/index.html` |
| 图标 | 新增 `src/components/icons/index.tsx`；`config/menuItems.ts→tsx`、`MainMenu.tsx/.css`、`Toolbar.tsx/.css`、`NodeLibrary.tsx/.css`、`PropertyDrawer.tsx`、`EnvironmentSelector.tsx/.css`、`MonitoringView.tsx/.css`、`ArchitectureView.tsx`、`UnderDevelopmentView.tsx/.css` |
| 外壳 | `src/App.css`、`src/App.tsx` |
| 面板/抽屉 | `PropertyDrawer.css`、`PropertyPanel.css`、`EdgeStylePanel.css`、`MetricsDetailDrawer.css`、`NodeTooltip.css`、`GraphCanvas.css` |
| 画布/节点 | `nodes/NodeStyles.css`、`nodes/ServerNode.tsx`、`nodes/GroupNode.tsx`、`CustomEdge.tsx` |
| 监控/图表 | `MonitoringView.css`、`MonitoringPanel.css/.tsx`、`MetricsDetailDrawer.tsx`；新增 `src/config/chartTheme.ts` |

## 测试与验收

**自动**
- `npx tsc --noEmit` —— 覆盖 `MenuItem.icon` 变 `React.ReactNode` 与 `menuItems.tsx` 改名后的类型链。
- `npm test` —— jest + ts-jest，CSS 已被 `styleMock` 替换且测试无 className 断言，改造后必须保持绿。
- `npm run build` —— 确认 CSS 中无 `color-mix()`、`@starting-style` 正常透传。

**手工（`npm start`）**
1. 首屏为 Apple 浅色：导航栏毛玻璃 + 细分割线，无渐变标题、无发光。
2. 切深色：逐屏检查导航栏、主菜单、侧栏、工具栏、三种抽屉、节点、画布网格、图表、toast，确认无浅色残留。
3. 服务架构：选环境 → 工具栏按钮按压有 `scale(0.97)`；下拉 150ms 从左上展开；节点库 30ms 步进入场；拖动节点；hover 出 tooltip 缩放入场；选中节点显示 2px 蓝环。
4. 监控一览：环境列表、running/warning/error 淡色节点、静态状态点、蓝色指标曲线；抽屉 transform 滑入，开 320ms / 关 200ms 可辨。
5. 逐个开合属性抽屉 / 连线样式 / 监控详情：左右遮罩只有 opacity 过渡，无 `right` 属性动画。
6. 日志查询 / 告警管理：UnderDevelopmentView 图标为线条图标且无浮动动画。
7. 键盘 Tab 遍历导航栏、主菜单、工具栏 → 有可见焦点环；DevTools 开启 `prefers-reduced-motion: reduce` → 无位移动画，opacity/color 过渡保留。
8. 窗口缩至 1200px / 768px → 布局与改造前一致，无溢出。

## 假设与默认（已定，无需再确认）

1. 默认主题 `apple-light`，开关切到 `apple-dark`；**不做 localStorage 持久化**（维持现状行为）。
2. Google Fonts 全部移除，Orbitron/Poppins/Quicksand 在代码库中不再引用。
3. emoji 不再承担 UI 图标职责，全部替换为内联单色 SVG。
4. **不重命名任何组件类名**，现有 CSS 选择器与测试继续有效。
5. **不新增 npm 依赖**，不引入动效库；全部用 CSS transition 实现。
6. 侧栏折叠仍过渡 `width`（flex 行内折叠的固有代价），已收窄为单属性并标 `ponytail:` 注释记录上限与升级路径。
7. 状态点的常驻 `pulse` 动画移除；仅保留单个连接心跳动画（功能性连续动作）。
8. 画布网格唯一来源为 React Flow `<Background>`，重复的 CSS 网格覆盖层删除。
9. 行为、数据契约、路由、菜单项数量均不变；仅新增图标组件与 `chartTheme.ts` 两个模块。
