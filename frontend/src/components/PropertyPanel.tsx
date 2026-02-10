import React, { useState, useEffect } from 'react';
import {
  Node,
  NodeProperties,
  HealthCheckConfig,
  MetricsConfig,
  MetricDefinition,
  ThresholdConfig,
  ActionConfig,
  ValidationResult
} from '../types';
import './PropertyPanel.css';

interface PropertyPanelProps {
  node: Node | null;
  onPropertiesChange: (nodeId: string, properties: NodeProperties) => void;
  onClose: () => void;
}

/**
 * PropertyPanel 组件
 * 用于编辑节点属性（健康检查、监控指标、控制操作）
 */
export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  node,
  onPropertiesChange,
  onClose
}) => {
  const [properties, setProperties] = useState<NodeProperties>({});
  const [activeTab, setActiveTab] = useState<'health' | 'metrics' | 'actions'>('health');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // 初始化属性
  useEffect(() => {
    if (node) {
      setProperties(node.properties || {});
      setValidationErrors([]);
    }
  }, [node]);

  if (!node) {
    return null;
  }

  // 验证属性值
  const validateProperties = (props: NodeProperties): ValidationResult => {
    const errors: string[] = [];

    // 验证健康检查配置
    if (props.healthCheck) {
      const hc = props.healthCheck;
      if (hc.interval <= 0) {
        errors.push('Health check interval must be greater than 0');
      }
      if (hc.timeout <= 0) {
        errors.push('Health check timeout must be greater than 0');
      }
      if (hc.retries < 0) {
        errors.push('Health check retries cannot be negative');
      }
      if (hc.type === 'http' && !hc.endpoint) {
        errors.push('HTTP endpoint is required for HTTP health check');
      }
      if (hc.type === 'tcp' && (!hc.host || !hc.port)) {
        errors.push('Host and port are required for TCP health check');
      }
      if (hc.type === 'script' && !hc.script) {
        errors.push('Script path is required for script health check');
      }
      if (hc.type === 'http' && hc.expectedStatus && hc.expectedStatus < 100) {
        errors.push('Expected HTTP status must be >= 100');
      }
    }

    // 验证监控指标配置
    if (props.metrics) {
      const mc = props.metrics;
      if (!mc.endpoint) {
        errors.push('Metrics endpoint is required');
      }
      if (mc.interval !== undefined && mc.interval <= 0) {
        errors.push('Metrics collection interval must be greater than 0');
      }
      if (!mc.metrics || mc.metrics.length === 0) {
        errors.push('At least one metric definition is required');
      }

      // 验证指标定义
      mc.metrics?.forEach((metric, index) => {
        if (!metric.name) {
          errors.push(`Metric ${index + 1}: name is required`);
        }
        if (!metric.path) {
          errors.push(`Metric ${index + 1}: path is required`);
        }
        if (!metric.unit) {
          errors.push(`Metric ${index + 1}: unit is required`);
        }

        // 验证阈值配置
        if (metric.threshold) {
          const tc = metric.threshold;
          if (tc.warning === undefined || tc.critical === undefined) {
            errors.push(`Metric ${index + 1}: both warning and critical thresholds are required`);
          }
          if (tc.warning >= tc.critical && tc.operator === '>') {
            errors.push(`Metric ${index + 1}: warning threshold must be less than critical`);
          }
        }
      });
    }

    // 验证操作配置
    if (props.actions) {
      props.actions.forEach((action, index) => {
        if (!action.name) {
          errors.push(`Action ${index + 1}: name is required`);
        }
        if (!action.displayName) {
          errors.push(`Action ${index + 1}: display name is required`);
        }
        if (action.type === 'http' && !action.endpoint) {
          errors.push(`Action ${index + 1}: HTTP endpoint is required`);
        }
        if (action.type === 'ssh' && (!action.host || !action.command)) {
          errors.push(`Action ${index + 1}: host and command are required for SSH`);
        }
        if (action.type === 'script' && !action.command) {
          errors.push(`Action ${index + 1}: script path is required`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  // 保存属性
  const handleSave = () => {
    const validation = validateProperties(properties);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    onPropertiesChange(node.id, properties);
  };

  // 更新健康检查配置
  const updateHealthCheck = (updates: Partial<HealthCheckConfig>) => {
    setProperties({
      ...properties,
      healthCheck: {
        ...properties.healthCheck,
        type: properties.healthCheck?.type || 'http',
        interval: properties.healthCheck?.interval || 60,
        timeout: properties.healthCheck?.timeout || 10,
        retries: properties.healthCheck?.retries || 3,
        ...updates
      }
    });
  };

  // 更新监控指标配置
  const updateMetrics = (updates: Partial<MetricsConfig>) => {
    setProperties({
      ...properties,
      metrics: {
        collectionMode: 'pull', // 默认为 pull 模式
        ...properties.metrics,
        endpoint: properties.metrics?.endpoint || '',
        interval: properties.metrics?.interval || 60,
        metrics: properties.metrics?.metrics || [],
        ...updates
      }
    });
  };

  // 添加指标定义
  const addMetricDefinition = () => {
    const newMetric: MetricDefinition = {
      name: '',
      path: '',
      unit: ''
    };

    setProperties({
      ...properties,
      metrics: {
        collectionMode: 'pull', // 默认为 pull 模式
        ...properties.metrics,
        endpoint: properties.metrics?.endpoint || '',
        interval: properties.metrics?.interval || 60,
        metrics: [...(properties.metrics?.metrics || []), newMetric]
      }
    });
  };

  // 更新指标定义
  const updateMetricDefinition = (index: number, updates: Partial<MetricDefinition>) => {
    if (!properties.metrics) return;

    const updatedMetrics = [...properties.metrics.metrics];
    updatedMetrics[index] = {
      ...updatedMetrics[index],
      ...updates
    };

    setProperties({
      ...properties,
      metrics: {
        ...properties.metrics,
        metrics: updatedMetrics
      }
    });
  };

  // 删除指标定义
  const removeMetricDefinition = (index: number) => {
    if (!properties.metrics) return;

    const updatedMetrics = properties.metrics.metrics.filter((_, i) => i !== index);

    setProperties({
      ...properties,
      metrics: {
        ...properties.metrics,
        metrics: updatedMetrics
      }
    });
  };

  // 更新阈值配置
  const updateThreshold = (metricIndex: number, updates: Partial<ThresholdConfig>) => {
    if (!properties.metrics) return;

    const updatedMetrics = [...properties.metrics.metrics];
    updatedMetrics[metricIndex] = {
      ...updatedMetrics[metricIndex],
      threshold: {
        ...updatedMetrics[metricIndex].threshold,
        warning: updatedMetrics[metricIndex].threshold?.warning || 0,
        critical: updatedMetrics[metricIndex].threshold?.critical || 0,
        operator: updatedMetrics[metricIndex].threshold?.operator || '>',
        ...updates
      }
    };

    setProperties({
      ...properties,
      metrics: {
        ...properties.metrics,
        metrics: updatedMetrics
      }
    });
  };

  // 添加操作配置
  const addAction = () => {
    const newAction: ActionConfig = {
      name: '',
      displayName: '',
      type: 'http',
      requireConfirmation: false
    };

    setProperties({
      ...properties,
      actions: [...(properties.actions || []), newAction]
    });
  };

  // 更新操作配置
  const updateAction = (index: number, updates: Partial<ActionConfig>) => {
    if (!properties.actions) return;

    const updatedActions = [...properties.actions];
    updatedActions[index] = {
      ...updatedActions[index],
      ...updates
    };

    setProperties({
      ...properties,
      actions: updatedActions
    });
  };

  // 删除操作配置
  const removeAction = (index: number) => {
    if (!properties.actions) return;

    const updatedActions = properties.actions.filter((_, i) => i !== index);

    setProperties({
      ...properties,
      actions: updatedActions
    });
  };

  return (
    <div className="property-panel">
      <div className="panel-header">
        <h2>Node Properties: {node.label}</h2>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <h4>Validation Errors:</h4>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel-tabs">
        <button
          className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          Health Check
        </button>
        <button
          className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Metrics
        </button>
        <button
          className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
          onClick={() => setActiveTab('actions')}
        >
          Actions
        </button>
      </div>

      <div className="panel-content">
        {/* Health Check Tab */}
        {activeTab === 'health' && (
          <div className="tab-content">
            <div className="form-group">
              <label>Check Type:</label>
              <select
                value={properties.healthCheck?.type || 'http'}
                onChange={(e) =>
                  updateHealthCheck({ type: e.target.value as 'http' | 'tcp' | 'script' })
                }
              >
                <option value="http">HTTP</option>
                <option value="tcp">TCP</option>
                <option value="script">Script</option>
              </select>
            </div>

            {properties.healthCheck?.type === 'http' && (
              <>
                <div className="form-group">
                  <label>Endpoint:</label>
                  <input
                    type="text"
                    value={properties.healthCheck?.endpoint || ''}
                    onChange={(e) => updateHealthCheck({ endpoint: e.target.value })}
                    placeholder="http://localhost:8080/health"
                  />
                </div>
                <div className="form-group">
                  <label>Expected Status Code:</label>
                  <input
                    type="number"
                    value={properties.healthCheck?.expectedStatus || 200}
                    onChange={(e) =>
                      updateHealthCheck({ expectedStatus: parseInt(e.target.value) })
                    }
                    min="100"
                    max="599"
                  />
                </div>
              </>
            )}

            {properties.healthCheck?.type === 'tcp' && (
              <>
                <div className="form-group">
                  <label>Host:</label>
                  <input
                    type="text"
                    value={properties.healthCheck?.host || ''}
                    onChange={(e) => updateHealthCheck({ host: e.target.value })}
                    placeholder="localhost"
                  />
                </div>
                <div className="form-group">
                  <label>Port:</label>
                  <input
                    type="number"
                    value={properties.healthCheck?.port || 8080}
                    onChange={(e) => updateHealthCheck({ port: parseInt(e.target.value) })}
                    min="1"
                    max="65535"
                  />
                </div>
              </>
            )}

            {properties.healthCheck?.type === 'script' && (
              <div className="form-group">
                <label>Script Path:</label>
                <input
                  type="text"
                  value={properties.healthCheck?.script || ''}
                  onChange={(e) => updateHealthCheck({ script: e.target.value })}
                  placeholder="/path/to/health-check.sh"
                />
              </div>
            )}

            <div className="form-group">
              <label>Check Interval (seconds):</label>
              <input
                type="number"
                value={properties.healthCheck?.interval || 60}
                onChange={(e) => updateHealthCheck({ interval: parseInt(e.target.value) })}
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Timeout (seconds):</label>
              <input
                type="number"
                value={properties.healthCheck?.timeout || 10}
                onChange={(e) => updateHealthCheck({ timeout: parseInt(e.target.value) })}
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Retries:</label>
              <input
                type="number"
                value={properties.healthCheck?.retries || 3}
                onChange={(e) => updateHealthCheck({ retries: parseInt(e.target.value) })}
                min="0"
              />
            </div>
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="tab-content">
            <div className="form-group">
              <label>Metrics Endpoint:</label>
              <input
                type="text"
                value={properties.metrics?.endpoint || ''}
                onChange={(e) => updateMetrics({ endpoint: e.target.value })}
                placeholder="http://localhost:9090/metrics"
              />
            </div>

            <div className="form-group">
              <label>Collection Interval (seconds):</label>
              <input
                type="number"
                value={properties.metrics?.interval || 60}
                onChange={(e) => updateMetrics({ interval: parseInt(e.target.value) })}
                min="1"
              />
            </div>

            <div className="metrics-definitions">
              <h4>Metric Definitions</h4>
              {properties.metrics?.metrics?.map((metric, index) => (
                <div key={index} className="metric-definition">
                  <div className="form-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={metric.name}
                      onChange={(e) => updateMetricDefinition(index, { name: e.target.value })}
                      placeholder="cpu_usage"
                    />
                  </div>

                  <div className="form-group">
                    <label>JSON Path:</label>
                    <input
                      type="text"
                      value={metric.path}
                      onChange={(e) => updateMetricDefinition(index, { path: e.target.value })}
                      placeholder="$.cpu.usage"
                    />
                  </div>

                  <div className="form-group">
                    <label>Unit:</label>
                    <input
                      type="text"
                      value={metric.unit}
                      onChange={(e) => updateMetricDefinition(index, { unit: e.target.value })}
                      placeholder="%"
                    />
                  </div>

                  <div className="threshold-section">
                    <h5>Threshold Configuration</h5>
                    <div className="form-group">
                      <label>Operator:</label>
                      <select
                        value={metric.threshold?.operator || '>'}
                        onChange={(e) =>
                          updateThreshold(index, {
                            operator: e.target.value as '>' | '<' | '>=' | '<=' | '=='
                          })
                        }
                      >
                        <option value=">">Greater than (&gt;)</option>
                        <option value="<">Less than (&lt;)</option>
                        <option value=">=">&gt;=</option>
                        <option value="<=">&lt;=</option>
                        <option value="==">Equal (==)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Warning Threshold:</label>
                      <input
                        type="number"
                        value={metric.threshold?.warning || 0}
                        onChange={(e) =>
                          updateThreshold(index, { warning: parseFloat(e.target.value) })
                        }
                        step="0.1"
                      />
                    </div>

                    <div className="form-group">
                      <label>Critical Threshold:</label>
                      <input
                        type="number"
                        value={metric.threshold?.critical || 0}
                        onChange={(e) =>
                          updateThreshold(index, { critical: parseFloat(e.target.value) })
                        }
                        step="0.1"
                      />
                    </div>
                  </div>

                  <button
                    className="remove-btn"
                    onClick={() => removeMetricDefinition(index)}
                  >
                    Remove Metric
                  </button>
                </div>
              ))}

              <button className="add-btn" onClick={addMetricDefinition}>
                + Add Metric Definition
              </button>
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="tab-content">
            <div className="actions-list">
              {properties.actions?.map((action, index) => (
                <div key={index} className="action-item">
                  <div className="form-group">
                    <label>Action Name:</label>
                    <input
                      type="text"
                      value={action.name}
                      onChange={(e) => updateAction(index, { name: e.target.value })}
                      placeholder="restart"
                    />
                  </div>

                  <div className="form-group">
                    <label>Display Name:</label>
                    <input
                      type="text"
                      value={action.displayName}
                      onChange={(e) => updateAction(index, { displayName: e.target.value })}
                      placeholder="Restart Service"
                    />
                  </div>

                  <div className="form-group">
                    <label>Action Type:</label>
                    <select
                      value={action.type}
                      onChange={(e) =>
                        updateAction(index, { type: e.target.value as 'http' | 'ssh' | 'script' })
                      }
                    >
                      <option value="http">HTTP</option>
                      <option value="ssh">SSH</option>
                      <option value="script">Script</option>
                    </select>
                  </div>

                  {action.type === 'http' && (
                    <>
                      <div className="form-group">
                        <label>Endpoint:</label>
                        <input
                          type="text"
                          value={action.endpoint || ''}
                          onChange={(e) => updateAction(index, { endpoint: e.target.value })}
                          placeholder="http://localhost:8080/restart"
                        />
                      </div>
                      <div className="form-group">
                        <label>Method:</label>
                        <select
                          value={action.method || 'POST'}
                          onChange={(e) => updateAction(index, { method: e.target.value })}
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>
                    </>
                  )}

                  {action.type === 'ssh' && (
                    <>
                      <div className="form-group">
                        <label>Host:</label>
                        <input
                          type="text"
                          value={action.host || ''}
                          onChange={(e) => updateAction(index, { host: e.target.value })}
                          placeholder="server.example.com"
                        />
                      </div>
                      <div className="form-group">
                        <label>Command:</label>
                        <input
                          type="text"
                          value={action.command || ''}
                          onChange={(e) => updateAction(index, { command: e.target.value })}
                          placeholder="systemctl restart myservice"
                        />
                      </div>
                    </>
                  )}

                  {action.type === 'script' && (
                    <div className="form-group">
                      <label>Script Path:</label>
                      <input
                        type="text"
                        value={action.command || ''}
                        onChange={(e) => updateAction(index, { command: e.target.value })}
                        placeholder="/path/to/restart.sh"
                      />
                    </div>
                  )}

                  <div className="form-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={action.requireConfirmation}
                        onChange={(e) =>
                          updateAction(index, { requireConfirmation: e.target.checked })
                        }
                      />
                      Require Confirmation
                    </label>
                  </div>

                  <button className="remove-btn" onClick={() => removeAction(index)}>
                    Remove Action
                  </button>
                </div>
              ))}

              <button className="add-btn" onClick={addAction}>
                + Add Action
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="panel-footer">
        <button className="save-btn" onClick={handleSave}>
          Save Properties
        </button>
        <button className="cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PropertyPanel;
