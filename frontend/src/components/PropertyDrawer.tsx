import React, { useState, useEffect } from 'react';
import { Node, HealthCheckConfig, MetricsConfig, ActionConfig, GraphData, MetricDefinition } from '../types';
import { getAllTemplates, applyTemplate, cloneMetrics } from '../config/metricTemplates';
import { API_ENDPOINTS } from '../config/api';
import { handleApiResponse, handleNetworkError } from '../utils/apiHelper';
import toast from 'react-hot-toast';
import './PropertyDrawer.css';

interface PropertyDrawerProps {
  visible: boolean;
  node: Node | null;
  nodes: Node[];  // 所有节点，用于查找服务器节点
  onClose: () => void;
  onSave: (node: Node) => void;
}

export const PropertyDrawer: React.FC<PropertyDrawerProps> = ({
  visible,
  node,
  nodes,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'health' | 'metrics' | 'actions'>('basic');
  const [editedNode, setEditedNode] = useState<Node | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // 获取当前主题的默认文本颜色
  const getDefaultTextColor = () => {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'tech-dark' ? '#e5e7eb' : '#1f2937';
  };

  useEffect(() => {
    if (node) {
      setEditedNode({ ...node });
      setValidationErrors([]);
    }
  }, [node]);

  if (!visible || !editedNode) {
    return null;
  }

  // 验证表单
  const validateForm = (): boolean => {
    const errors: string[] = [];

    // 服务器节点必须填写 IP 和端口
    if (editedNode.type === 'server') {
      if (!editedNode.properties.ip || editedNode.properties.ip.trim() === '') {
        errors.push('服务器节点的 IP 地址为必填项');
      }
      if (!editedNode.properties.port) {
        errors.push('服务器节点的端口为必填项');
      }
    }

    // 健康检查脚本内容的条件必填验证
    if (editedNode.properties.healthCheck?.type === 'script') {
      // 查找所属服务器节点
      const serverNode = editedNode.properties.serverId 
        ? nodes.find(n => n.id === editedNode.properties.serverId)
        : null;

      // 如果服务器节点没有设置用户名和密码，则脚本内容必填
      if (serverNode) {
        const hasCredentials = serverNode.properties.username && serverNode.properties.password;
        if (!hasCredentials && !editedNode.properties.healthCheck.scriptContent) {
          errors.push('健康检查脚本内容为必填项（所属服务器未设置用户名密码）');
        }
      } else if (!editedNode.properties.healthCheck.scriptContent) {
        // 如果没有所属服务器，脚本内容也必填
        errors.push('健康检查脚本内容为必填项');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (editedNode && validateForm()) {
      onSave(editedNode);
      onClose();
    }
  };

  const handleBasicChange = (field: string, value: any) => {
    setEditedNode({
      ...editedNode,
      [field]: value
    });
  };

  const handlePropertyChange = (field: string, value: any) => {
    setEditedNode({
      ...editedNode,
      properties: {
        ...editedNode.properties,
        [field]: value
      }
    });
  };

  return (
    <>
      <div className={`drawer-overlay ${visible ? 'visible' : ''}`} />
      <div className={`property-drawer ${visible ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>配置面板</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        {/* 文本节点只显示样式配置 */}
        {editedNode.type === 'text' ? (
          <>
            <div className="drawer-content">
              <div className="tab-panel">
                <div className="form-group">
                  <label>文本内容</label>
                  <textarea
                    value={editedNode.label || ''}
                    onChange={(e) => handleBasicChange('label', e.target.value)}
                    placeholder="输入文本内容"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '4px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>文本颜色</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={editedNode.properties.metadata?.color || getDefaultTextColor()}
                      onChange={(e) => handlePropertyChange('metadata', {
                        ...editedNode.properties.metadata,
                        color: e.target.value
                      })}
                      style={{ width: '50px', height: '36px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={editedNode.properties.metadata?.color || getDefaultTextColor()}
                      onChange={(e) => handlePropertyChange('metadata', {
                        ...editedNode.properties.metadata,
                        color: e.target.value
                      })}
                      placeholder={getDefaultTextColor()}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>字体大小</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="10"
                      max="48"
                      value={editedNode.properties.metadata?.fontSize || 14}
                      onChange={(e) => handlePropertyChange('metadata', {
                        ...editedNode.properties.metadata,
                        fontSize: parseInt(e.target.value)
                      })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: '50px', textAlign: 'right' }}>
                      {editedNode.properties.metadata?.fontSize || 14}px
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label>对齐方式</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className={`align-btn ${(editedNode.properties.metadata?.textAlign || 'left') === 'left' ? 'active' : ''}`}
                      onClick={() => handlePropertyChange('metadata', {
                        ...editedNode.properties.metadata,
                        textAlign: 'left'
                      })}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: '1px solid var(--border-primary)',
                        background: (editedNode.properties.metadata?.textAlign || 'left') === 'left' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                        color: (editedNode.properties.metadata?.textAlign || 'left') === 'left' ? 'white' : 'var(--text-primary)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ⬅ 左对齐
                    </button>
                    <button
                      className={`align-btn ${editedNode.properties.metadata?.textAlign === 'center' ? 'active' : ''}`}
                      onClick={() => handlePropertyChange('metadata', {
                        ...editedNode.properties.metadata,
                        textAlign: 'center'
                      })}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: '1px solid var(--border-primary)',
                        background: editedNode.properties.metadata?.textAlign === 'center' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                        color: editedNode.properties.metadata?.textAlign === 'center' ? 'white' : 'var(--text-primary)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ↔ 居中
                    </button>
                    <button
                      className={`align-btn ${editedNode.properties.metadata?.textAlign === 'right' ? 'active' : ''}`}
                      onClick={() => handlePropertyChange('metadata', {
                        ...editedNode.properties.metadata,
                        textAlign: 'right'
                      })}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: '1px solid var(--border-primary)',
                        background: editedNode.properties.metadata?.textAlign === 'right' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                        color: editedNode.properties.metadata?.textAlign === 'right' ? 'white' : 'var(--text-primary)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ➡ 右对齐
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>预览</label>
                  <div style={{
                    padding: '16px',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '4px',
                    background: 'var(--bg-secondary)',
                    color: editedNode.properties.metadata?.color || getDefaultTextColor(),
                    fontSize: `${editedNode.properties.metadata?.fontSize || 14}px`,
                    textAlign: (editedNode.properties.metadata?.textAlign as any) || 'left'
                  }}>
                    {editedNode.label || '文本预览'}
                  </div>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button className="btn btn-cancel" onClick={onClose}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>保存</button>
            </div>
          </>
        ) : editedNode.type === 'group' ? (
          /* 群组节点只显示样式配置 */
          <>
            <div className="drawer-content">
              <div className="tab-panel">
                <div className="form-group">
                  <label>描述信息</label>
                  <textarea
                    value={editedNode.properties.metadata?.description || ''}
                    onChange={(e) => handlePropertyChange('metadata', {
                      ...editedNode.properties.metadata,
                      description: e.target.value
                    })}
                    placeholder="输入群组描述（可选，显示在左上角）"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '4px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>线条宽度</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={editedNode.properties.metadata?.borderWidth || 3}
                      onChange={(e) => handlePropertyChange('metadata', {
                        ...editedNode.properties.metadata,
                        borderWidth: parseInt(e.target.value)
                      })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: '50px', textAlign: 'right' }}>
                      {editedNode.properties.metadata?.borderWidth || 3}px
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label>线条颜色</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={(() => {
                        const color = editedNode.properties.metadata?.borderColor || 'rgba(150, 150, 150, 0.3)';
                        // 将 rgba 转换为 hex（用于颜色选择器）
                        if (color.startsWith('rgba')) {
                          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                          if (match) {
                            const r = parseInt(match[1]).toString(16).padStart(2, '0');
                            const g = parseInt(match[2]).toString(16).padStart(2, '0');
                            const b = parseInt(match[3]).toString(16).padStart(2, '0');
                            return `#${r}${g}${b}`;
                          }
                        }
                        return color.startsWith('#') ? color : '#969696';
                      })()}
                      onChange={(e) => {
                        // 将 hex 转换为 rgba
                        const hex = e.target.value;
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        const alpha = editedNode.properties.metadata?.borderColor?.match(/[\d.]+\)$/)?.[0].slice(0, -1) || '0.3';
                        handlePropertyChange('metadata', {
                          ...editedNode.properties.metadata,
                          borderColor: `rgba(${r}, ${g}, ${b}, ${alpha})`
                        });
                      }}
                      style={{ width: '50px', height: '36px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={editedNode.properties.metadata?.borderColor || 'rgba(150, 150, 150, 0.3)'}
                      onChange={(e) => handlePropertyChange('metadata', {
                        ...editedNode.properties.metadata,
                        borderColor: e.target.value
                      })}
                      placeholder="rgba(150, 150, 150, 0.3)"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <small style={{ color: '#8c8c8c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    支持 rgba、rgb、hex 格式，例如: rgba(150, 150, 150, 0.3)
                  </small>
                </div>

                <div className="form-group">
                  <label>透明度</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(() => {
                        const color = editedNode.properties.metadata?.borderColor || 'rgba(150, 150, 150, 0.3)';
                        const match = color.match(/[\d.]+\)$/);
                        if (match) {
                          return Math.round(parseFloat(match[0].slice(0, -1)) * 100);
                        }
                        return 30;
                      })()}
                      onChange={(e) => {
                        const alpha = parseInt(e.target.value) / 100;
                        const color = editedNode.properties.metadata?.borderColor || 'rgba(150, 150, 150, 0.3)';
                        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                        if (match) {
                          handlePropertyChange('metadata', {
                            ...editedNode.properties.metadata,
                            borderColor: `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`
                          });
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: '50px', textAlign: 'right' }}>
                      {(() => {
                        const color = editedNode.properties.metadata?.borderColor || 'rgba(150, 150, 150, 0.3)';
                        const match = color.match(/[\d.]+\)$/);
                        if (match) {
                          return Math.round(parseFloat(match[0].slice(0, -1)) * 100);
                        }
                        return 30;
                      })()}%
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label>预览</label>
                  <div style={{
                    padding: '24px',
                    border: `${editedNode.properties.metadata?.borderWidth || 3}px dashed ${editedNode.properties.metadata?.borderColor || 'rgba(150, 150, 150, 0.3)'}`,
                    borderRadius: '8px',
                    background: 'transparent',
                    minHeight: '100px',
                    position: 'relative'
                  }}>
                    {editedNode.properties.metadata?.description && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)'
                      }}>
                        {editedNode.properties.metadata.description}
                      </div>
                    )}
                    <div style={{
                      textAlign: 'center',
                      color: '#8c8c8c',
                      fontSize: '12px',
                      marginTop: editedNode.properties.metadata?.description ? '24px' : '0'
                    }}>
                      群组边框预览
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button className="btn btn-cancel" onClick={onClose}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>保存</button>
            </div>
          </>
        ) : (
          <>
            <div className="drawer-tabs">
              <button
                className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
                onClick={() => setActiveTab('basic')}
              >
                基本信息
              </button>
              <button
                className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`}
                onClick={() => setActiveTab('health')}
              >
                健康检查
              </button>
              <button
                className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
                onClick={() => setActiveTab('metrics')}
              >
                监控指标
              </button>
              <button
                className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
                onClick={() => setActiveTab('actions')}
              >
                操作配置
              </button>
            </div>

            <div className="drawer-content">
              {validationErrors.length > 0 && (
                <div className="validation-errors">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="error-message">{error}</div>
                  ))}
                </div>
              )}
              
              {activeTab === 'basic' && (
                <div className="tab-panel">
              <div className="form-group">
                <label>节点名称</label>
                <input
                  type="text"
                  value={editedNode.label}
                  onChange={(e) => handleBasicChange('label', e.target.value)}
                  placeholder="输入节点名称"
                />
              </div>
              <div className="form-group">
                <label>节点类型</label>
                <select
                  value={editedNode.type}
                  onChange={(e) => handleBasicChange('type', e.target.value)}
                >
                  <option value="server">服务器</option>
                  <option value="service">服务</option>
                  <option value="database">数据库</option>
                  <option value="cache">缓存</option>
                  <option value="queue">消息队列</option>
                  <option value="gateway">网关</option>
                  <option value="loadbalancer">负载均衡</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              {/* 服务器节点的特殊字段 */}
              {editedNode.type === 'server' && (
                <>
                  <div className="form-group">
                    <label><span className="required">*</span>IP 地址</label>
                    <input
                      type="text"
                      value={editedNode.properties.ip || ''}
                      onChange={(e) => handlePropertyChange('ip', e.target.value)}
                      placeholder="例如: 192.168.1.100"
                    />
                  </div>
                  <div className="form-group">
                    <label><span className="required">*</span>端口</label>
                    <input
                      type="number"
                      value={editedNode.properties.port || ''}
                      onChange={(e) => handlePropertyChange('port', parseInt(e.target.value) || '')}
                      placeholder="例如: 22"
                    />
                  </div>
                  <div className="form-group">
                    <label>用户名</label>
                    <input
                      type="text"
                      value={editedNode.properties.username || ''}
                      onChange={(e) => handlePropertyChange('username', e.target.value)}
                      placeholder="SSH 用户名（可选）"
                    />
                  </div>
                  <div className="form-group">
                    <label>密码</label>
                    <input
                      type="password"
                      value={editedNode.properties.password || ''}
                      onChange={(e) => handlePropertyChange('password', e.target.value)}
                      placeholder="SSH 密码（可选）"
                    />
                  </div>
                </>
              )}

              {/* 非服务器节点需要选择所属服务器 */}
              {editedNode.type !== 'server' && (
                <>
                  <div className="form-group">
                    <label>所属服务器</label>
                    <select
                      value={editedNode.properties.serverId || ''}
                      onChange={(e) => handlePropertyChange('serverId', e.target.value)}
                    >
                      <option value="">请选择服务器</option>
                      {nodes.filter(n => n.type === 'server').map(server => (
                        <option key={server.id} value={server.id}>
                          {server.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>端口</label>
                    <input
                      type="number"
                      value={editedNode.properties.port || ''}
                      onChange={(e) => handlePropertyChange('port', parseInt(e.target.value) || '')}
                      placeholder="服务端口（可选）"
                    />
                  </div>
                  <div className="form-group">
                    <label>资源目录</label>
                    <input
                      type="text"
                      value={editedNode.properties.resourcePath || ''}
                      onChange={(e) => handlePropertyChange('resourcePath', e.target.value)}
                      placeholder="例如: /opt/app 或 /var/www/html（可选）"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>描述</label>
                <textarea
                  value={editedNode.properties.metadata?.description || ''}
                  onChange={(e) => handlePropertyChange('metadata', {
                    ...editedNode.properties.metadata,
                    description: e.target.value
                  })}
                  placeholder="输入节点描述"
                  rows={4}
                />
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="tab-panel">
              <div className="form-group">
                <label>检查类型</label>
                <select
                  value={editedNode.properties.healthCheck?.type || 'http'}
                  onChange={(e) => handlePropertyChange('healthCheck', {
                    ...editedNode.properties.healthCheck,
                    type: e.target.value
                  })}
                >
                  <option value="http">HTTP</option>
                  <option value="tcp">TCP</option>
                  <option value="script">脚本</option>
                </select>
              </div>
              
              {editedNode.properties.healthCheck?.type === 'http' && (
                <div className="form-group">
                  <label>端点地址</label>
                  <input
                    type="text"
                    value={editedNode.properties.healthCheck?.endpoint || ''}
                    onChange={(e) => handlePropertyChange('healthCheck', {
                      ...editedNode.properties.healthCheck,
                      endpoint: e.target.value
                    })}
                    placeholder="http://example.com/health"
                  />
                </div>
              )}

              {editedNode.properties.healthCheck?.type === 'script' && (
                <div className="form-group">
                  <label>
                    {(() => {
                      // 判断脚本内容是否必填
                      const serverNode = editedNode.properties.serverId 
                        ? nodes.find(n => n.id === editedNode.properties.serverId)
                        : null;
                      const hasCredentials = serverNode?.properties.username && serverNode?.properties.password;
                      return hasCredentials ? '脚本内容' : <><span className="required">*</span>脚本内容</>;
                    })()}
                  </label>
                  <textarea
                    value={editedNode.properties.healthCheck?.scriptContent || ''}
                    onChange={(e) => handlePropertyChange('healthCheck', {
                      ...editedNode.properties.healthCheck,
                      scriptContent: e.target.value
                    })}
                    placeholder="输入健康检查脚本内容"
                    rows={6}
                  />
                  <small style={{ color: '#8c8c8c', fontSize: '12px' }}>
                    提示: 如果所属服务器设置了用户名和密码，系统将通过 SSH 执行 telnet 检查，此字段可不填
                  </small>
                </div>
              )}

              <div className="form-group">
                <label>检查间隔（秒）</label>
                <input
                  type="number"
                  value={editedNode.properties.healthCheck?.interval || 30}
                  onChange={(e) => handlePropertyChange('healthCheck', {
                    ...editedNode.properties.healthCheck,
                    interval: parseInt(e.target.value)
                  })}
                  min="5"
                />
              </div>

              <div className="form-group">
                <label>超时时间（秒）</label>
                <input
                  type="number"
                  value={editedNode.properties.healthCheck?.timeout || 5}
                  onChange={(e) => handlePropertyChange('healthCheck', {
                    ...editedNode.properties.healthCheck,
                    timeout: parseInt(e.target.value)
                  })}
                  min="1"
                />
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="tab-panel">
              {/* 采集方式选择 */}
              <div className="form-group">
                <label>采集方式</label>
                <select
                  value={editedNode.properties.metrics?.collectionMode || 'pull'}
                  onChange={(e) => {
                    const newMode = e.target.value as 'pull' | 'push' | 'exporter';
                    handlePropertyChange('metrics', {
                      ...editedNode.properties.metrics,
                      collectionMode: newMode,
                      // 清除其他模式的配置
                      endpoint: newMode === 'pull' ? editedNode.properties.metrics?.endpoint : undefined,
                      pushToken: newMode === 'push' ? (editedNode.properties.metrics?.pushToken || `token_${Date.now()}`) : undefined,
                      exporterUrl: newMode === 'exporter' ? editedNode.properties.metrics?.exporterUrl : undefined,
                      exporterType: newMode === 'exporter' ? 'prometheus' : undefined
                    });
                  }}
                >
                  <option value="pull">Pull 拉取模式（主动采集）</option>
                  <option value="push">Push 推送模式（被动接收）</option>
                  <option value="exporter">Exporter 模式（Prometheus）</option>
                </select>
                <small style={{ color: '#8c8c8c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {editedNode.properties.metrics?.collectionMode === 'pull' && '后端定时从目标服务拉取指标数据'}
                  {editedNode.properties.metrics?.collectionMode === 'push' && '目标服务主动推送指标数据到监控后端'}
                  {editedNode.properties.metrics?.collectionMode === 'exporter' && '使用 Prometheus Exporter 采集系统级指标'}
                </small>
              </div>

              {/* Pull 模式配置 */}
              {(!editedNode.properties.metrics?.collectionMode || editedNode.properties.metrics?.collectionMode === 'pull') && (
                <>
                  {/* 指标模板选择 */}
                  <div className="form-group">
                    <label>指标模板</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        id="metric-template-select"
                        style={{ flex: 1 }}
                        defaultValue=""
                      >
                        <option value="">选择预定义模板...</option>
                        {getAllTemplates().map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name} - {template.description}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          const select = document.getElementById('metric-template-select') as HTMLSelectElement;
                          const templateId = select.value;
                          if (templateId) {
                            const templateConfig = applyTemplate(templateId, editedNode.properties.ip ? `http://${editedNode.properties.ip}` : undefined);
                            if (templateConfig) {
                              handlePropertyChange('metrics', {
                                ...editedNode.properties.metrics,
                                ...templateConfig,
                                metrics: cloneMetrics(templateConfig.metrics || [])
                              });
                            }
                          }
                        }}
                        style={{ padding: '0 16px' }}
                      >
                        应用
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>端点地址 (Endpoint)</label>
                    <input
                      type="text"
                      value={editedNode.properties.metrics?.endpoint || ''}
                      onChange={(e) => handlePropertyChange('metrics', {
                        ...editedNode.properties.metrics,
                        collectionMode: 'pull',
                        endpoint: e.target.value
                      })}
                      placeholder="http://service:8080/actuator/metrics"
                    />
                  </div>

                  <div className="form-group">
                    <label>采集间隔（秒）</label>
                    <input
                      type="number"
                      value={editedNode.properties.metrics?.interval || 30}
                      onChange={(e) => handlePropertyChange('metrics', {
                        ...editedNode.properties.metrics,
                        collectionMode: 'pull',
                        interval: parseInt(e.target.value)
                      })}
                      min="5"
                    />
                  </div>

                  <div className="form-group">
                    <label>超时时间（秒）</label>
                    <input
                      type="number"
                      value={editedNode.properties.metrics?.timeout || 5}
                      onChange={(e) => handlePropertyChange('metrics', {
                        ...editedNode.properties.metrics,
                        collectionMode: 'pull',
                        timeout: parseInt(e.target.value)
                      })}
                      min="1"
                    />
                  </div>

                  {/* 测试连接按钮 */}
                  {editedNode.properties.metrics?.endpoint && (
                    <div className="form-group">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={async () => {
                          try {
                            const response = await fetch(API_ENDPOINTS.metricsTestConnection, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                endpoint: editedNode.properties.metrics?.endpoint,
                                timeout: editedNode.properties.metrics?.timeout || 5,
                                metrics: editedNode.properties.metrics?.metrics || []
                              })
                            });

                            const data = await handleApiResponse(response);

                            // 成功时显示详细信息
                            toast.success(
                              `测试连接成功！\n\n端点: ${data.endpoint}\n响应时间: ${data.responseTime}ms\n状态码: ${data.status}\n检测到 ${data.metrics.length} 个指标`,
                              {
                                duration: 5000,
                                position: 'top-center',
                                style: {
                                  background: 'var(--bg-elevated)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--color-success)',
                                  borderRadius: 'var(--border-radius-md)',
                                  padding: '16px 20px',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  whiteSpace: 'pre-line',
                                  maxWidth: '500px',
                                },
                                icon: '✅',
                              }
                            );
                          } catch (error: any) {
                            handleNetworkError(error);
                          }
                        }}
                        style={{ width: '100%' }}
                      >
                        🔗 测试连接
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Push 模式配置 */}
              {editedNode.properties.metrics?.collectionMode === 'push' && (
                <>
                  <div className="form-group">
                    <label>推送地址</label>
                    <input
                      type="text"
                      value={API_ENDPOINTS.nodeMetricsPush(editedNode.id)}
                      readOnly
                      style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                    <small style={{ color: '#8c8c8c', fontSize: '12px' }}>
                      配置到目标服务，让其推送指标数据到此地址
                    </small>
                  </div>

                  <div className="form-group">
                    <label>推送令牌 (Token)</label>
                    <input
                      type="text"
                      value={editedNode.properties.metrics?.pushToken || ''}
                      onChange={(e) => handlePropertyChange('metrics', {
                        ...editedNode.properties.metrics,
                        collectionMode: 'push',
                        pushToken: e.target.value
                      })}
                      placeholder="自动生成或手动设置"
                    />
                    <small style={{ color: '#8c8c8c', fontSize: '12px' }}>
                      用于验证推送请求的身份
                    </small>
                  </div>

                  <div className="form-group">
                    <label>预期推送间隔（秒）</label>
                    <input
                      type="number"
                      value={editedNode.properties.metrics?.expectedInterval || 60}
                      onChange={(e) => handlePropertyChange('metrics', {
                        ...editedNode.properties.metrics,
                        collectionMode: 'push',
                        expectedInterval: parseInt(e.target.value)
                      })}
                      min="10"
                    />
                    <small style={{ color: '#8c8c8c', fontSize: '12px' }}>
                      超过此时间未收到推送将视为异常
                    </small>
                  </div>
                </>
              )}

              {/* Exporter 模式配置 */}
              {editedNode.properties.metrics?.collectionMode === 'exporter' && (
                <>
                  <div className="form-group">
                    <label>Exporter 类型</label>
                    <select
                      value={editedNode.properties.metrics?.exporterType || 'prometheus'}
                      onChange={(e) => handlePropertyChange('metrics', {
                        ...editedNode.properties.metrics,
                        collectionMode: 'exporter',
                        exporterType: e.target.value as 'prometheus' | 'custom'
                      })}
                    >
                      <option value="prometheus">Prometheus</option>
                      <option value="custom">自定义</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Exporter URL</label>
                    <input
                      type="text"
                      value={editedNode.properties.metrics?.exporterUrl || ''}
                      onChange={(e) => handlePropertyChange('metrics', {
                        ...editedNode.properties.metrics,
                        collectionMode: 'exporter',
                        exporterUrl: e.target.value
                      })}
                      placeholder="http://localhost:9100/metrics"
                    />
                  </div>

                  <div className="form-group">
                    <label>采集间隔（秒）</label>
                    <input
                      type="number"
                      value={editedNode.properties.metrics?.interval || 60}
                      onChange={(e) => handlePropertyChange('metrics', {
                        ...editedNode.properties.metrics,
                        collectionMode: 'exporter',
                        interval: parseInt(e.target.value)
                      })}
                      min="10"
                    />
                  </div>
                </>
              )}

              {/* 指标列表编辑器 */}
              <div className="form-group" style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>指标列表</label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const newMetric: MetricDefinition = {
                        name: '新指标',
                        path: 'path.to.value',
                        unit: 'count'
                      };
                      handlePropertyChange('metrics', {
                        ...editedNode.properties.metrics,
                        metrics: [...(editedNode.properties.metrics?.metrics || []), newMetric]
                      });
                    }}
                    style={{ fontSize: '14px', padding: '4px 12px' }}
                  >
                    + 添加指标
                  </button>
                </div>

                {(!editedNode.properties.metrics?.metrics || editedNode.properties.metrics.metrics.length === 0) && (
                  <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#8c8c8c' }}>
                    暂无指标，点击"添加指标"或"应用模板"来配置
                  </div>
                )}

                {editedNode.properties.metrics?.metrics && editedNode.properties.metrics.metrics.map((metric, index) => (
                  <div key={index} style={{
                    border: '1px solid var(--border-primary)',
                    borderRadius: '4px',
                    padding: '12px',
                    marginBottom: '12px',
                    backgroundColor: 'var(--bg-secondary)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong>指标 #{index + 1}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          const newMetrics = editedNode.properties.metrics!.metrics.filter((_, i) => i !== index);
                          handlePropertyChange('metrics', {
                            ...editedNode.properties.metrics,
                            metrics: newMetrics
                          });
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ff4d4f',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#8c8c8c' }}>指标名称</label>
                      <input
                        type="text"
                        value={metric.name}
                        onChange={(e) => {
                          const newMetrics = [...editedNode.properties.metrics!.metrics];
                          newMetrics[index] = { ...newMetrics[index], name: e.target.value };
                          handlePropertyChange('metrics', {
                            ...editedNode.properties.metrics,
                            metrics: newMetrics
                          });
                        }}
                        placeholder="CPU 使用率"
                        style={{ width: '100%', fontSize: '14px' }}
                      />
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#8c8c8c' }}>JSON 路径</label>
                      <input
                        type="text"
                        value={metric.path}
                        onChange={(e) => {
                          const newMetrics = [...editedNode.properties.metrics!.metrics];
                          newMetrics[index] = { ...newMetrics[index], path: e.target.value };
                          handlePropertyChange('metrics', {
                            ...editedNode.properties.metrics,
                            metrics: newMetrics
                          });
                        }}
                        placeholder="cpu.usage 或 measurements[0].value"
                        style={{ width: '100%', fontSize: '14px' }}
                      />
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#8c8c8c' }}>单位</label>
                      <input
                        type="text"
                        value={metric.unit}
                        onChange={(e) => {
                          const newMetrics = [...editedNode.properties.metrics!.metrics];
                          newMetrics[index] = { ...newMetrics[index], unit: e.target.value };
                          handlePropertyChange('metrics', {
                            ...editedNode.properties.metrics,
                            metrics: newMetrics
                          });
                        }}
                        placeholder="%, MB, ms, count"
                        style={{ width: '100%', fontSize: '14px' }}
                      />
                    </div>

                    {/* 阈值配置 */}
                    <details style={{ marginTop: '12px' }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '13px', userSelect: 'none' }}>
                        ⚙️ 阈值配置（可选）
                      </summary>
                      <div style={{ marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid var(--border-primary)' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '12px', color: '#8c8c8c' }}>Warning 阈值</label>
                          <input
                            type="number"
                            value={metric.threshold?.warning || ''}
                            onChange={(e) => {
                              const newMetrics = [...editedNode.properties.metrics!.metrics];
                              newMetrics[index] = {
                                ...newMetrics[index],
                                threshold: {
                                  ...newMetrics[index].threshold,
                                  warning: parseFloat(e.target.value),
                                  critical: newMetrics[index].threshold?.critical || parseFloat(e.target.value) * 1.2,
                                  operator: newMetrics[index].threshold?.operator || '>'
                                }
                              };
                              handlePropertyChange('metrics', {
                                ...editedNode.properties.metrics,
                                metrics: newMetrics
                              });
                            }}
                            placeholder="70"
                            style={{ width: '100%', fontSize: '14px' }}
                          />
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '12px', color: '#8c8c8c' }}>Critical 阈值</label>
                          <input
                            type="number"
                            value={metric.threshold?.critical || ''}
                            onChange={(e) => {
                              const newMetrics = [...editedNode.properties.metrics!.metrics];
                              newMetrics[index] = {
                                ...newMetrics[index],
                                threshold: {
                                  ...newMetrics[index].threshold,
                                  warning: newMetrics[index].threshold?.warning || parseFloat(e.target.value) * 0.8,
                                  critical: parseFloat(e.target.value),
                                  operator: newMetrics[index].threshold?.operator || '>'
                                }
                              };
                              handlePropertyChange('metrics', {
                                ...editedNode.properties.metrics,
                                metrics: newMetrics
                              });
                            }}
                            placeholder="90"
                            style={{ width: '100%', fontSize: '14px' }}
                          />
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '12px', color: '#8c8c8c' }}>比较运算符</label>
                          <select
                            value={metric.threshold?.operator || '>'}
                            onChange={(e) => {
                              const newMetrics = [...editedNode.properties.metrics!.metrics];
                              newMetrics[index] = {
                                ...newMetrics[index],
                                threshold: {
                                  ...newMetrics[index].threshold!,
                                  operator: e.target.value as '>' | '<' | '>=' | '<=' | '=='
                                }
                              };
                              handlePropertyChange('metrics', {
                                ...editedNode.properties.metrics,
                                metrics: newMetrics
                              });
                            }}
                            style={{ width: '100%', fontSize: '14px' }}
                          >
                            <option value=">">大于 (&gt;)</option>
                            <option value="<">小于 (&lt;)</option>
                            <option value=">=">大于等于 (&gt;=)</option>
                            <option value="<=">小于等于 (&lt;=)</option>
                            <option value="==">等于 (==)</option>
                          </select>
                        </div>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="tab-panel">
              <p className="info-text">操作配置功能开发中...</p>
            </div>
          )}
            </div>

            <div className="drawer-footer">
              <button className="btn btn-cancel" onClick={onClose}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>保存</button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default PropertyDrawer;
