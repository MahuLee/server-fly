import React from 'react';
import './Toolbar.css';

interface ToolbarProps {
  onSave?: () => void;
  onExport?: () => void;
  onExportImage?: (format: 'png' | 'svg') => void;
  onImport?: () => void;
  onRefresh?: () => void;
  disabled?: boolean;
}

/**
 * Toolbar 组件
 * 提供保存、导出、刷新等常用操作按钮
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  onSave,
  onExport,
  onExportImage,
  onImport,
  onRefresh,
  disabled = false
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button
          className="toolbar-button"
          onClick={onSave}
          disabled={disabled || !onSave}
          title="保存架构图"
        >
          <span className="toolbar-icon">💾</span>
          <span className="toolbar-label">保存</span>
        </button>

        <div className="toolbar-dropdown">
          <button
            className="toolbar-button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={disabled || !onExport}
            title="导出架构图"
          >
            <span className="toolbar-icon">📥</span>
            <span className="toolbar-label">导出</span>
            <span className="toolbar-arrow">▼</span>
          </button>
          {showExportMenu && (
            <div className="dropdown-menu">
              <div
                className="dropdown-item"
                onClick={() => {
                  onExport?.();
                  setShowExportMenu(false);
                }}
              >
                导出为 JSON
              </div>
              <div
                className="dropdown-item"
                onClick={() => {
                  onExportImage?.('png');
                  setShowExportMenu(false);
                }}
              >
                导出为 PNG
              </div>
              <div
                className="dropdown-item"
                onClick={() => {
                  onExportImage?.('svg');
                  setShowExportMenu(false);
                }}
              >
                导出为 SVG
              </div>
            </div>
          )}
        </div>

        <button
          className="toolbar-button"
          onClick={onImport}
          disabled={disabled || !onImport}
          title="导入架构图"
        >
          <span className="toolbar-icon">📤</span>
          <span className="toolbar-label">导入</span>
        </button>

        <button
          className="toolbar-button"
          onClick={onRefresh}
          disabled={disabled || !onRefresh}
          title="刷新数据"
        >
          <span className="toolbar-icon">🔄</span>
          <span className="toolbar-label">刷新</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
