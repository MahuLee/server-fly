import React, { useState, useEffect } from 'react';
import './EdgeStylePanel.css';

export interface EdgeStyle {
  strokeWidth: number;
  stroke: string;
  strokeDasharray?: string;
  label?: string;
  animated?: boolean;
  markerEnd?: string;
}

interface EdgeStylePanelProps {
  visible: boolean;
  edgeId: string | null;
  currentStyle: EdgeStyle;
  onClose: () => void;
  onSave: (edgeId: string, style: EdgeStyle) => void;
}

const EdgeStylePanel: React.FC<EdgeStylePanelProps> = ({
  visible,
  edgeId,
  currentStyle,
  onClose,
  onSave
}) => {
  const [strokeWidth, setStrokeWidth] = useState(currentStyle.strokeWidth || 2);
  const [stroke, setStroke] = useState(currentStyle.stroke || '#999');
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [label, setLabel] = useState(currentStyle.label || '');
  const [animated, setAnimated] = useState(currentStyle.animated || false);
  const [arrowType, setArrowType] = useState<'arrow' | 'arrowclosed' | 'none'>('arrow');

  useEffect(() => {
    setStrokeWidth(currentStyle.strokeWidth || 2);
    setStroke(currentStyle.stroke || '#999');
    setLabel(currentStyle.label || '');
    setAnimated(currentStyle.animated || false);
    
    // 解析线条样式
    if (!currentStyle.strokeDasharray) {
      setLineStyle('solid');
    } else if (currentStyle.strokeDasharray === '5 5') {
      setLineStyle('dashed');
    } else if (currentStyle.strokeDasharray === '2 2') {
      setLineStyle('dotted');
    }
  }, [currentStyle]);

  const handleSave = () => {
    if (!edgeId) return;

    let strokeDasharray: string | undefined;
    if (lineStyle === 'dashed') {
      strokeDasharray = '5 5';
    } else if (lineStyle === 'dotted') {
      strokeDasharray = '2 2';
    }

    const style: EdgeStyle = {
      strokeWidth,
      stroke,
      strokeDasharray,
      label,
      animated,
      markerEnd: arrowType !== 'none' ? arrowType : undefined
    };

    onSave(edgeId, style);
    onClose();
  };

  if (!visible) return null;

  return (
    <>
      <div className={`edge-style-drawer-overlay ${visible ? 'visible' : ''}`} />
      <div className={`edge-style-drawer ${visible ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>边样式设置</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="drawer-content">
          {/* 线条宽度 */}
          <div className="form-group">
            <label>线条宽度: {strokeWidth}px</label>
            <input
              type="range"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="slider"
            />
          </div>

          {/* 线条颜色 */}
          <div className="form-group">
            <label>线条颜色</label>
            <div className="color-picker-group">
              <input
                type="color"
                value={stroke}
                onChange={(e) => setStroke(e.target.value)}
                className="color-input"
              />
              <input
                type="text"
                value={stroke}
                onChange={(e) => setStroke(e.target.value)}
                className="color-text"
                placeholder="#999999"
              />
            </div>
          </div>

          {/* 线条样式 */}
          <div className="form-group">
            <label>线条样式</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="solid"
                  checked={lineStyle === 'solid'}
                  onChange={(e) => setLineStyle(e.target.value as 'solid')}
                />
                <span className="line-preview solid"></span>
                实线
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="dashed"
                  checked={lineStyle === 'dashed'}
                  onChange={(e) => setLineStyle(e.target.value as 'dashed')}
                />
                <span className="line-preview dashed"></span>
                虚线
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="dotted"
                  checked={lineStyle === 'dotted'}
                  onChange={(e) => setLineStyle(e.target.value as 'dotted')}
                />
                <span className="line-preview dotted"></span>
                点线
              </label>
            </div>
          </div>

          {/* 箭头样式 */}
          <div className="form-group">
            <label>箭头样式</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="arrow"
                  checked={arrowType === 'arrow'}
                  onChange={(e) => setArrowType(e.target.value as 'arrow')}
                />
                开放箭头 →
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="arrowclosed"
                  checked={arrowType === 'arrowclosed'}
                  onChange={(e) => setArrowType(e.target.value as 'arrowclosed')}
                />
                封闭箭头 ▶
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="none"
                  checked={arrowType === 'none'}
                  onChange={(e) => setArrowType(e.target.value as 'none')}
                />
                无箭头 —
              </label>
            </div>
          </div>

          {/* 标签文字 */}
          <div className="form-group">
            <label>标签文字</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="text-input"
              placeholder="输入标签文字"
            />
          </div>

          {/* 动画效果 */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={animated}
                onChange={(e) => setAnimated(e.target.checked)}
              />
              启用动画效果
            </label>
          </div>

          {/* 预览 */}
          <div className="form-group">
            <label>预览</label>
            <div className="preview-container">
              <svg width="100%" height="60">
                <defs>
                  <marker
                    id="preview-arrow"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L9,3 z" fill={stroke} />
                  </marker>
                  <marker
                    id="preview-arrowclosed"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L9,3 z" fill={stroke} stroke={stroke} />
                  </marker>
                </defs>
                <line
                  x1="10"
                  y1="30"
                  x2="90%"
                  y2="30"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={
                    lineStyle === 'dashed' ? '5 5' :
                    lineStyle === 'dotted' ? '2 2' : undefined
                  }
                  markerEnd={
                    arrowType === 'arrow' ? 'url(#preview-arrow)' :
                    arrowType === 'arrowclosed' ? 'url(#preview-arrowclosed)' : undefined
                  }
                >
                  {animated && (
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="20"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  )}
                </line>
                {label && (
                  <text
                    x="50%"
                    y="20"
                    textAnchor="middle"
                    fill={stroke}
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {label}
                  </text>
                )}
              </svg>
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn btn-cancel" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-save" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </>
  );
};

export default EdgeStylePanel;
