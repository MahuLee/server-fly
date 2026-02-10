import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Environment, ApiResponse } from '../types';
import { API_BASE_URL } from '../config/api';
import './EnvironmentSelector.css';

interface EnvironmentSelectorProps {
  onEnvironmentChange?: (env: Environment) => void;
  apiBaseUrl?: string;
}

const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  onEnvironmentChange,
  apiBaseUrl = API_BASE_URL
}) => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // 加载环境列表
  const loadEnvironments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/environments`);
      const result: ApiResponse<Environment[]> = await response.json();
      
      if (result.success && result.data) {
        setEnvironments(result.data);
        // 如果没有当前环境且有环境列表，选择第一个
        if (!currentEnvironment && result.data.length > 0) {
          selectEnvironment(result.data[0].id);
        }
      } else {
        setError(result.error || 'Failed to load environments');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load environments');
    } finally {
      setIsLoading(false);
    }
  };

  // 选择环境
  const selectEnvironment = async (envId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/environments/${envId}`);
      const result: ApiResponse<Environment> = await response.json();
      
      if (result.success && result.data) {
        setCurrentEnvironment(result.data);
        if (onEnvironmentChange) {
          onEnvironmentChange(result.data);
        }
      } else {
        setError(result.error || 'Failed to load environment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load environment');
    }
  };

  // 创建环境
  const createEnvironment = async () => {
    if (!formData.name || !formData.description) {
      setError('名称和描述为必填项');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result: ApiResponse<Environment> = await response.json();
      
      if (result.success && result.data) {
        setShowCreateDialog(false);
        setFormData({ name: '', description: '' });
        await loadEnvironments();
        selectEnvironment(result.data.id);
      } else {
        setError(result.error || 'Failed to create environment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create environment');
    } finally {
      setIsLoading(false);
    }
  };

  // 更新环境
  const updateEnvironment = async () => {
    if (!editingEnv || !formData.name || !formData.description) {
      setError('名称和描述为必填项');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/environments/${editingEnv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result: ApiResponse<Environment> = await response.json();
      
      if (result.success && result.data) {
        setShowEditDialog(false);
        setEditingEnv(null);
        setFormData({ name: '', description: '' });
        await loadEnvironments();
        if (currentEnvironment?.id === result.data.id) {
          setCurrentEnvironment(result.data);
        }
      } else {
        setError(result.error || 'Failed to update environment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update environment');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除环境
  const deleteEnvironment = async (envId: string) => {
    if (!window.confirm('确定要删除此环境吗？')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/environments/${envId}`, {
        method: 'DELETE'
      });
      const result: ApiResponse<null> = await response.json();
      
      if (result.success) {
        await loadEnvironments();
        if (currentEnvironment?.id === envId) {
          setCurrentEnvironment(null);
        }
      } else {
        setError(result.error || 'Failed to delete environment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete environment');
    } finally {
      setIsLoading(false);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (env: Environment) => {
    setEditingEnv(env);
    setFormData({ name: env.name, description: env.description });
    setShowEditDialog(true);
  };

  // 初始加载
  useEffect(() => {
    loadEnvironments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="environment-selector">
      <div className="environment-selector-header">
        <h3>环境</h3>
        <button
          className="btn-create"
          onClick={() => setShowCreateDialog(true)}
          disabled={isLoading}
        >
          + 新建
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {isLoading && <div className="loading">加载中...</div>}

      <div className="environment-list">
        {environments.map(env => (
          <div
            key={env.id}
            className={`environment-item ${currentEnvironment?.id === env.id ? 'active' : ''}`}
          >
            <div
              className="environment-info"
              onClick={() => selectEnvironment(env.id)}
            >
              <div className="environment-name">{env.name}</div>
              <div className="environment-description">{env.description}</div>
            </div>
            <div className="environment-actions">
              <button
                className="btn-edit"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDialog(env);
                }}
                title="编辑"
              >
                ✎
              </button>
              <button
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteEnvironment(env.id);
                }}
                title="删除"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {environments.length === 0 && !isLoading && (
        <div className="empty-state">
          暂无环境，请创建一个开始使用。
        </div>
      )}

      {/* Create Dialog - 使用 Portal 渲染到 body */}
      {showCreateDialog && createPortal(
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>创建环境</h3>
            <div className="form-group">
              <label>名称：</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：生产环境"
              />
            </div>
            <div className="form-group">
              <label>描述：</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例如：生产环境描述"
                rows={3}
              />
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowCreateDialog(false)}>取消</button>
              <button onClick={createEnvironment} disabled={isLoading}>
                创建
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Dialog - 使用 Portal 渲染到 body */}
      {showEditDialog && editingEnv && createPortal(
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>编辑环境</h3>
            <div className="form-group">
              <label>名称：</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>描述：</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowEditDialog(false)}>取消</button>
              <button onClick={updateEnvironment} disabled={isLoading}>
                保存
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EnvironmentSelector;
