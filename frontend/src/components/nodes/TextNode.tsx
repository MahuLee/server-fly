import React, { useState, useRef, useEffect } from 'react';
import { NodeProps } from 'reactflow';

interface TextNodeData {
  text: string;
  color?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  onTextChange?: (text: string) => void;
}

const TextNode: React.FC<NodeProps<TextNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.text || '双击编辑文本');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 当 data.text 变化时更新本地状态
  useEffect(() => {
    setText(data.text || '双击编辑文本');
  }, [data.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent) => {
    // 如果已经在编辑模式，阻止事件传播
    if (isEditing) {
      e.stopPropagation();
      return;
    }

    // 单击时不阻止事件传播，让 GraphCanvas 处理选择
    // 不再需要双击进入编辑模式，改为在抽屉中编辑
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onTextChange) {
      data.onTextChange(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      setIsEditing(false);
      if (data.onTextChange) {
        data.onTextChange(text);
      }
    }
  };

  const color = data.color || 'var(--text-primary)';
  const fontSize = data.fontSize || 14;
  const textAlign = data.textAlign || 'left';

  return (
    <div
      className={`text-node ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      style={{
        padding: '8px 12px',
        background: 'transparent',
        border: selected ? '2px dashed var(--color-primary)' : '2px dashed transparent',
        borderRadius: '4px',
        minWidth: '100px',
        minHeight: '30px',
        cursor: isEditing ? 'text' : 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            minWidth: '150px',
            minHeight: '30px',
            border: 'none',
            outline: 'none',
            background: 'var(--bg-elevated)',
            color: color,
            fontSize: `${fontSize}px`,
            fontFamily: 'inherit',
            resize: 'both',
            padding: '4px',
            borderRadius: '4px',
            textAlign: textAlign
          }}
        />
      ) : (
        <div
          style={{
            color: color,
            fontSize: `${fontSize}px`,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            textAlign: textAlign
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

export default TextNode;
