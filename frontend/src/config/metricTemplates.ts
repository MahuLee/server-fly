/**
 * 预定义指标模板
 * 为常见的应用类型提供开箱即用的监控指标配置
 */

import { MetricsConfig } from '../types';

export interface MetricTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<MetricsConfig>;
}

/**
 * 预定义指标模板库
 */
export const METRIC_TEMPLATES: Record<string, MetricTemplate> = {
  'spring-boot-actuator': {
    id: 'spring-boot-actuator',
    name: 'Spring Boot Actuator',
    description: 'Spring Boot 应用的 Actuator 监控端点',
    config: {
      collectionMode: 'pull',
      endpoint: '/actuator/metrics',
      interval: 30,
      timeout: 5,
      metrics: [
        {
          name: 'JVM Memory Used',
          path: 'measurements[0].value',
          unit: 'MB',
          threshold: {
            warning: 1024,
            critical: 2048,
            operator: '>'
          }
        },
        {
          name: 'JVM Threads Live',
          path: 'measurements[0].value',
          unit: 'threads',
          threshold: {
            warning: 100,
            critical: 200,
            operator: '>'
          }
        },
        {
          name: 'HTTP Server Requests',
          path: 'measurements[0].value',
          unit: 'req/s',
        },
        {
          name: 'System CPU Usage',
          path: 'measurements[0].value',
          unit: '%',
          threshold: {
            warning: 70,
            critical: 85,
            operator: '>'
          }
        },
        {
          name: 'Process CPU Usage',
          path: 'measurements[0].value',
          unit: '%',
          threshold: {
            warning: 70,
            critical: 85,
            operator: '>'
          }
        }
      ]
    }
  },

  'nodejs-express': {
    id: 'nodejs-express',
    name: 'Node.js + Express',
    description: 'Node.js Express 应用的监控指标',
    config: {
      collectionMode: 'pull',
      endpoint: '/metrics',
      interval: 30,
      timeout: 5,
      metrics: [
        {
          name: 'Event Loop Lag',
          path: 'eventLoop.lag',
          unit: 'ms',
          threshold: {
            warning: 100,
            critical: 200,
            operator: '>'
          }
        },
        {
          name: 'Memory RSS',
          path: 'memory.rss',
          unit: 'MB',
          threshold: {
            warning: 512,
            critical: 1024,
            operator: '>'
          }
        },
        {
          name: 'Memory Heap Used',
          path: 'memory.heapUsed',
          unit: 'MB',
          threshold: {
            warning: 256,
            critical: 512,
            operator: '>'
          }
        },
        {
          name: 'CPU Usage',
          path: 'cpu.usage',
          unit: '%',
          threshold: {
            warning: 70,
            critical: 85,
            operator: '>'
          }
        },
        {
          name: 'Active Requests',
          path: 'requests.active',
          unit: 'count',
        },
        {
          name: 'Request Rate',
          path: 'requests.rate',
          unit: 'req/s',
        }
      ]
    }
  },

  'prometheus-exporter': {
    id: 'prometheus-exporter',
    name: 'Prometheus Node Exporter',
    description: 'Prometheus Node Exporter 的标准指标',
    config: {
      collectionMode: 'exporter',
      exporterType: 'prometheus',
      exporterUrl: 'http://localhost:9100/metrics',
      interval: 60,
      timeout: 10,
      metrics: [
        {
          name: 'CPU Idle',
          path: 'node_cpu_seconds_total{mode="idle"}',
          unit: 'seconds',
        },
        {
          name: 'Memory Available',
          path: 'node_memory_MemAvailable_bytes',
          unit: 'bytes',
          threshold: {
            warning: 1073741824, // 1GB
            critical: 536870912,  // 512MB
            operator: '<'
          }
        },
        {
          name: 'Disk Free',
          path: 'node_filesystem_free_bytes{mountpoint="/"}',
          unit: 'bytes',
          threshold: {
            warning: 10737418240, // 10GB
            critical: 5368709120,  // 5GB
            operator: '<'
          }
        },
        {
          name: 'Network Receive',
          path: 'node_network_receive_bytes_total',
          unit: 'bytes/s',
        },
        {
          name: 'Network Transmit',
          path: 'node_network_transmit_bytes_total',
          unit: 'bytes/s',
        }
      ]
    }
  },

  'custom-json': {
    id: 'custom-json',
    name: '自定义 JSON 端点',
    description: '通用的 JSON 格式监控端点',
    config: {
      collectionMode: 'pull',
      endpoint: '/api/metrics',
      interval: 30,
      timeout: 5,
      metrics: [
        {
          name: '示例指标 1',
          path: 'metric1.value',
          unit: 'count',
        },
        {
          name: '示例指标 2',
          path: 'metric2.value',
          unit: '%',
          threshold: {
            warning: 80,
            critical: 90,
            operator: '>'
          }
        }
      ]
    }
  }
};

/**
 * 获取所有模板列表
 */
export function getAllTemplates(): MetricTemplate[] {
  return Object.values(METRIC_TEMPLATES);
}

/**
 * 根据 ID 获取模板
 */
export function getTemplateById(id: string): MetricTemplate | undefined {
  return METRIC_TEMPLATES[id];
}

/**
 * 应用模板到现有配置
 * @param templateId 模板ID
 * @param baseUrl 基础URL（可选，用于替换 endpoint 中的占位符）
 */
export function applyTemplate(
  templateId: string,
  baseUrl?: string
): Partial<MetricsConfig> | null {
  const template = getTemplateById(templateId);
  if (!template) {
    return null;
  }

  const config = { ...template.config };

  // 如果提供了 baseUrl，替换 endpoint
  if (baseUrl && config.endpoint) {
    // 移除 baseUrl 末尾的斜杠
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    // 确保 endpoint 以斜杠开头
    const cleanEndpoint = config.endpoint.startsWith('/')
      ? config.endpoint
      : `/${config.endpoint}`;

    config.endpoint = `${cleanBaseUrl}${cleanEndpoint}`;
  }

  return config;
}

/**
 * 深拷贝指标定义数组
 */
export function cloneMetrics(metrics: any[]): any[] {
  return JSON.parse(JSON.stringify(metrics));
}
