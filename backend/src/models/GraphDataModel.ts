import { GraphData, Node, Edge, LayoutConfig, ValidationResult } from '../types';

/**
 * GraphDataModel 类
 * 负责架构图数据的序列化、反序列化和验证
 */
export class GraphDataModel {
  /**
   * 验证架构图数据
   * @param data 架构图数据
   * @returns 验证结果
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Graph data cannot be null or undefined');
      return { valid: false, errors };
    }

    if (!Array.isArray(data.nodes)) {
      errors.push('nodes must be an array');
    } else {
      data.nodes.forEach((node: any, index: number) => {
        const nodeErrors = NodeModel.validate(node).errors;
        nodeErrors.forEach(err => {
          errors.push(`nodes[${index}]: ${err}`);
        });
      });
    }

    if (!Array.isArray(data.edges)) {
      errors.push('edges must be an array');
    } else {
      data.edges.forEach((edge: any, index: number) => {
        const edgeErrors = EdgeModel.validate(edge).errors;
        edgeErrors.forEach(err => {
          errors.push(`edges[${index}]: ${err}`);
        });
      });
    }

    if (data.layout !== undefined && typeof data.layout !== 'object') {
      errors.push('layout must be an object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 序列化架构图数据为 JSON 字符串
   * @param data 架构图数据
   * @returns JSON 字符串
   */
  static serialize(data: GraphData): string {
    const validation = this.validate(data);
    if (!validation.valid) {
      throw new Error(`Invalid graph data: ${validation.errors.join(', ')}`);
    }

    return JSON.stringify(data);
  }

  /**
   * 反序列化 JSON 字符串为架构图数据
   * @param json JSON 字符串
   * @returns 架构图数据
   */
  static deserialize(json: string): GraphData {
    try {
      const data = JSON.parse(json);
      const validation = this.validate(data);

      if (!validation.valid) {
        throw new Error(`Invalid graph data: ${validation.errors.join(', ')}`);
      }

      return data as GraphData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 创建空的架构图数据
   * @returns 空的架构图数据
   */
  static createEmpty(): GraphData {
    return {
      nodes: [],
      edges: [],
      layout: {}
    };
  }
}

/**
 * NodeModel 类
 * 负责节点数据的验证
 */
export class NodeModel {
  /**
   * 验证节点数据
   * @param data 节点数据
   * @returns 验证结果
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Node cannot be null or undefined');
      return { valid: false, errors };
    }

    if (typeof data.id !== 'string' || data.id.trim() === '') {
      errors.push('id must be a non-empty string');
    }

    if (typeof data.type !== 'string' || data.type.trim() === '') {
      errors.push('type must be a non-empty string');
    }

    if (typeof data.label !== 'string' || data.label === '') {
      errors.push('label must be a non-empty string');
    }

    if (typeof data.x !== 'number' || isNaN(data.x)) {
      errors.push('x must be a valid number');
    }

    if (typeof data.y !== 'number' || isNaN(data.y)) {
      errors.push('y must be a valid number');
    }

    if (data.properties !== undefined && typeof data.properties !== 'object') {
      errors.push('properties must be an object');
    }

    if (data.state !== undefined) {
      const stateErrors = NodeStateModel.validate(data.state).errors;
      stateErrors.forEach(err => {
        errors.push(`state: ${err}`);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * EdgeModel 类
 * 负责边数据的验证
 */
export class EdgeModel {
  /**
   * 验证边数据
   * @param data 边数据
   * @returns 验证结果
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Edge cannot be null or undefined');
      return { valid: false, errors };
    }

    if (typeof data.id !== 'string' || data.id.trim() === '') {
      errors.push('id must be a non-empty string');
    }

    if (typeof data.source !== 'string' || data.source.trim() === '') {
      errors.push('source must be a non-empty string');
    }

    if (typeof data.target !== 'string' || data.target.trim() === '') {
      errors.push('target must be a non-empty string');
    }

    if (data.label !== undefined && data.label !== null && typeof data.label !== 'string') {
      errors.push('label must be a string or null');
    }

    if (data.style !== undefined && typeof data.style !== 'object') {
      errors.push('style must be an object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * NodeStateModel 类
 * 负责节点状态数据的验证
 */
export class NodeStateModel {
  private static readonly VALID_STATUSES = ['running', 'error', 'warning', 'unknown'];

  /**
   * 验证节点状态数据
   * @param data 节点状态数据
   * @returns 验证结果
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Node state cannot be null or undefined');
      return { valid: false, errors };
    }

    if (!this.VALID_STATUSES.includes(data.status)) {
      errors.push(`status must be one of: ${this.VALID_STATUSES.join(', ')}`);
    }

    if (data.lastCheckTime !== undefined) {
      if (!(data.lastCheckTime instanceof Date) && typeof data.lastCheckTime !== 'string') {
        errors.push('lastCheckTime must be a Date or ISO string');
      }
    }

    if (data.message !== undefined && data.message !== null && typeof data.message !== 'string') {
      errors.push('message must be a string or null');
    }

    if (data.metrics !== undefined && !Array.isArray(data.metrics)) {
      errors.push('metrics must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * NodePropertiesModel 类
 * 负责节点属性数据的验证
 */
export class NodePropertiesModel {
  /**
   * 验证节点属性数据
   * @param data 节点属性数据
   * @returns 验证结果
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      return { valid: true, errors };
    }

    if (data.healthCheck !== undefined) {
      const hcErrors = HealthCheckConfigModel.validate(data.healthCheck).errors;
      hcErrors.forEach(err => {
        errors.push(`healthCheck: ${err}`);
      });
    }

    if (data.metrics !== undefined) {
      const metricsErrors = MetricsConfigModel.validate(data.metrics).errors;
      metricsErrors.forEach(err => {
        errors.push(`metrics: ${err}`);
      });
    }

    if (data.actions !== undefined) {
      if (!Array.isArray(data.actions)) {
        errors.push('actions must be an array');
      } else {
        data.actions.forEach((action: any, index: number) => {
          const actionErrors = ActionConfigModel.validate(action).errors;
          actionErrors.forEach(err => {
            errors.push(`actions[${index}]: ${err}`);
          });
        });
      }
    }

    if (data.metadata !== undefined && typeof data.metadata !== 'object') {
      errors.push('metadata must be an object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * HealthCheckConfigModel 类
 * 负责健康检查配置的验证
 */
export class HealthCheckConfigModel {
  private static readonly VALID_TYPES = ['http', 'tcp', 'script'];

  /**
   * 验证健康检查配置
   * @param data 健康检查配置
   * @returns 验证结果
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Health check config cannot be null or undefined');
      return { valid: false, errors };
    }

    if (!this.VALID_TYPES.includes(data.type)) {
      errors.push(`type must be one of: ${this.VALID_TYPES.join(', ')}`);
    }

    if (typeof data.interval !== 'number' || data.interval <= 0) {
      errors.push('interval must be a positive number');
    }

    if (typeof data.timeout !== 'number' || data.timeout <= 0) {
      errors.push('timeout must be a positive number');
    }

    if (typeof data.retries !== 'number' || data.retries < 0) {
      errors.push('retries must be a non-negative number');
    }

    if (data.type === 'http') {
      if (typeof data.endpoint !== 'string' || data.endpoint.trim() === '') {
        errors.push('endpoint is required for http type');
      }
    }

    if (data.type === 'tcp') {
      if (typeof data.host !== 'string' || data.host.trim() === '') {
        errors.push('host is required for tcp type');
      }
      if (typeof data.port !== 'number' || data.port < 1 || data.port > 65535) {
        errors.push('port must be a number between 1 and 65535 for tcp type');
      }
    }

    if (data.type === 'script') {
      if (typeof data.script !== 'string' || data.script.trim() === '') {
        errors.push('script is required for script type');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * MetricsConfigModel 类
 * 负责监控指标配置的验证
 */
export class MetricsConfigModel {
  /**
   * 验证监控指标配置
   * @param data 监控指标配置
   * @returns 验证结果
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Metrics config cannot be null or undefined');
      return { valid: false, errors };
    }

    if (typeof data.endpoint !== 'string' || data.endpoint.trim() === '') {
      errors.push('endpoint must be a non-empty string');
    }

    if (typeof data.interval !== 'number' || data.interval <= 0) {
      errors.push('interval must be a positive number');
    }

    if (!Array.isArray(data.metrics)) {
      errors.push('metrics must be an array');
    } else {
      data.metrics.forEach((metric: any, index: number) => {
        const metricErrors = MetricDefinitionModel.validate(metric).errors;
        metricErrors.forEach(err => {
          errors.push(`metrics[${index}]: ${err}`);
        });
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * MetricDefinitionModel 类
 * 负责指标定义的验证
 */
export class MetricDefinitionModel {
  /**
   * 验证指标定义
   * @param data 指标定义
   * @returns 验证结果
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Metric definition cannot be null or undefined');
      return { valid: false, errors };
    }

    if (typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push('name must be a non-empty string');
    }

    if (typeof data.path !== 'string' || data.path.trim() === '') {
      errors.push('path must be a non-empty string');
    }

    if (typeof data.unit !== 'string' || data.unit.trim() === '') {
      errors.push('unit must be a non-empty string');
    }

    if (data.threshold !== undefined) {
      const thresholdErrors = ThresholdConfigModel.validate(data.threshold).errors;
      thresholdErrors.forEach(err => {
        errors.push(`threshold: ${err}`);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * ThresholdConfigModel 类
 * 负责阈值配置的验证
 */
export class ThresholdConfigModel {
  private static readonly VALID_OPERATORS = ['>', '<', '>=', '<=', '=='];

  /**
   * 验证阈值配置
   * @param data 阈值配置
   * @returns 验证结果
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Threshold config cannot be null or undefined');
      return { valid: false, errors };
    }

    if (typeof data.warning !== 'number' || isNaN(data.warning)) {
      errors.push('warning must be a valid number');
    }

    if (typeof data.critical !== 'number' || isNaN(data.critical)) {
      errors.push('critical must be a valid number');
    }

    if (!this.VALID_OPERATORS.includes(data.operator)) {
      errors.push(`operator must be one of: ${this.VALID_OPERATORS.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * ActionConfigModel 类
 * 负责操作配置的验证
 */
export class ActionConfigModel {
  private static readonly VALID_TYPES = ['http', 'ssh', 'script'];

  /**
   * 验证操作配置
   * @param data 操作配置
   * @returns 验证结果
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Action config cannot be null or undefined');
      return { valid: false, errors };
    }

    if (typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push('name must be a non-empty string');
    }

    if (typeof data.displayName !== 'string' || data.displayName.trim() === '') {
      errors.push('displayName must be a non-empty string');
    }

    if (!this.VALID_TYPES.includes(data.type)) {
      errors.push(`type must be one of: ${this.VALID_TYPES.join(', ')}`);
    }

    if (typeof data.requireConfirmation !== 'boolean') {
      errors.push('requireConfirmation must be a boolean');
    }

    if (data.type === 'http') {
      if (typeof data.endpoint !== 'string' || data.endpoint.trim() === '') {
        errors.push('endpoint is required for http type');
      }
      if (data.method && typeof data.method !== 'string') {
        errors.push('method must be a string');
      }
    }

    if (data.type === 'ssh') {
      if (typeof data.host !== 'string' || data.host.trim() === '') {
        errors.push('host is required for ssh type');
      }
      if (typeof data.command !== 'string' || data.command.trim() === '') {
        errors.push('command is required for ssh type');
      }
    }

    if (data.type === 'script') {
      if (typeof data.command !== 'string' || data.command.trim() === '') {
        errors.push('command is required for script type');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default GraphDataModel;
