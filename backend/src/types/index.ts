/**
 * 核心类型定义
 */

// 环境
export interface Environment {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// 架构图数据
export interface GraphData {
  nodes: Node[];
  edges: Edge[];
  layout?: LayoutConfig;
}

// 节点
export interface Node {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  properties: NodeProperties;
  state: NodeState;
}

// 节点属性
export interface NodeProperties {
  ip?: string;           // 服务器节点的IP地址
  port?: number;         // 端口号
  username?: string;     // 服务器用户名
  password?: string;     // 服务器密码
  serverId?: string;     // 所属服务器节点ID
  resourcePath?: string; // 资源目录（非服务器和群组节点可选）
  size?: [number, number]; // 节点大小 [宽度, 高度]
  healthCheck?: HealthCheckConfig;
  metrics?: MetricsConfig;
  actions?: ActionConfig[];
  metadata?: Record<string, any>;
}

// 健康检查配置
export interface HealthCheckConfig {
  type: 'http' | 'tcp' | 'script';
  endpoint?: string;
  host?: string;
  port?: number;
  scriptContent?: string;
  interval: number;
  timeout: number;
  retries: number;
  expectedStatus?: number;
}

// 监控指标配置
export interface MetricsConfig {
  collectionMode: 'pull' | 'push' | 'exporter';  // 采集方式

  // Pull 模式配置
  endpoint?: string;           // HTTP endpoint
  interval?: number;           // 采集间隔（秒）
  timeout?: number;            // 超时时间（秒），默认5秒

  // Push 模式配置
  pushToken?: string;          // 推送认证令牌
  expectedInterval?: number;   // 预期推送间隔（秒），用于超时检测

  // Exporter 模式配置
  exporterType?: 'prometheus' | 'custom';  // Exporter 类型
  exporterUrl?: string;        // Exporter URL

  // 通用配置
  metrics: MetricDefinition[]; // 指标定义列表
}

export interface MetricDefinition {
  name: string;
  path: string;
  unit: string;
  threshold?: ThresholdConfig;
}

export interface ThresholdConfig {
  warning: number;
  critical: number;
  operator: '>' | '<' | '>=' | '<=' | '==';
}

// 操作配置
export interface ActionConfig {
  name: string;
  displayName: string;
  type: 'http' | 'ssh' | 'script';
  endpoint?: string;
  method?: string;
  host?: string;
  command?: string;
  requireConfirmation: boolean;
}

// 节点状态
export interface NodeState {
  status: 'running' | 'error' | 'warning' | 'unknown';
  lastCheckTime: Date;
  message?: string;
  metrics?: MetricData[];
}

// 边
export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  style?: EdgeStyle;
  animated?: boolean;
  markerEnd?: string;
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  [key: string]: any;
}

// 指标数据
export interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  thresholdViolation?: 'warning' | 'critical';
}

// 健康检查结果
export interface HealthCheckResult {
  nodeId: string;
  success: boolean;
  status: 'running' | 'error';
  responseTime: number;
  message: string;
  timestamp: Date;
}

// 操作结果
export interface ActionResult {
  success: boolean;
  message: string;
  output?: string;
  timestamp: Date;
}

// 操作日志
export interface ActionLog {
  id: string;
  nodeId: string;
  action: string;
  result: ActionResult;
  timestamp: Date;
}

// 状态历史
export interface StatusHistory {
  id: string;
  nodeId: string;
  status: 'running' | 'error' | 'warning' | 'unknown';
  message?: string;
  timestamp: Date;
}

// 布局配置
export interface LayoutConfig {
  type?: string;
  [key: string]: any;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 验证结果
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
