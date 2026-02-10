import React, { useState, useRef, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  useReactFlow,
} from 'reactflow';

const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  label,
}) => {
  const { setEdges } = useReactFlow();
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelText, setLabelText] = useState((label as string) || '');
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 使用 smoothstep 路径
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingLabel]);

  // 处理中间锚点双击 - 编辑标签
  const handleMidAnchorDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingLabel(true);
  };

  const handleLabelBlur = () => {
    setIsEditingLabel(false);
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id ? { ...edge, label: labelText } : edge
      )
    );
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      setIsEditingLabel(false);
      setEdges((edges) =>
        edges.map((edge) =>
          edge.id === id ? { ...edge, label: labelText } : edge
        )
      );
    } else if (e.key === 'Escape') {
      setIsEditingLabel(false);
      setLabelText((label as string) || '');
    }
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: selected ? ((style.strokeWidth as number) || 2) + 1 : (style.strokeWidth as number) || 2,
        }} 
      />
      
      {/* 悬浮或选中时显示锚点 */}
      {(isHovered || selected) && (
        <EdgeLabelRenderer>
          {/* 开始锚点 */}
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX}px,${sourceY}px)`,
              width: '12px',
              height: '12px',
              background: '#4a90e2',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'pointer',
              pointerEvents: 'all',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(74, 144, 226, 0.5)',
            }}
            title="起点"
          />

          {/* 结束锚点 */}
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetX}px,${targetY}px)`,
              width: '12px',
              height: '12px',
              background: '#4a90e2',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'pointer',
              pointerEvents: 'all',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(74, 144, 226, 0.5)',
            }}
            title="终点"
          />

          {/* 中间锚点 */}
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              width: '16px',
              height: '16px',
              background: '#10b981',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'pointer',
              pointerEvents: 'all',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'white',
              fontWeight: 'bold',
            }}
            onDoubleClick={handleMidAnchorDoubleClick}
            title="双击编辑标签"
          >
            T
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* 悬浮检测区域 - 透明的较宽区域 */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* 标签始终显示（不管是否选中） */}
      {(labelText || isEditingLabel) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 20}px)`,
              background: 'var(--bg-elevated)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              pointerEvents: isEditingLabel ? 'all' : 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              border: '1px solid var(--border-primary)',
              minWidth: '60px',
              textAlign: 'center',
            }}
          >
            {isEditingLabel ? (
              <input
                ref={inputRef}
                type="text"
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onBlur={handleLabelBlur}
                onKeyDown={handleLabelKeyDown}
                onClick={(e) => e.stopPropagation()}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  width: '100%',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textAlign: 'center',
                }}
              />
            ) : (
              labelText
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;
