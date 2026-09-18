import React from 'react';

/**
 * 单色线性图标集（Apple 风格）
 * 统一 stroke="currentColor"、1.5 描边、圆头圆角，默认继承文字色。
 */

export interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 18,
  className,
  strokeWidth = 1.5,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

/* --- 导航 / 菜单 --- */

export const MonitorIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
    <path d="M7 12l2.5-3 2.5 4 2-2.5L17 12" />
  </Svg>
);

export const LayersIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" />
    <path d="M4 12l8 4.5 8-4.5" />
    <path d="M4 16.5L12 21l8-4.5" />
  </Svg>
);

export const DocIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Svg>
);

export const BellIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M18 8a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6z" />
    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
  </Svg>
);

/* --- 工具栏 --- */

export const SaveIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </Svg>
);

export const ImportIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5" />
  </Svg>
);

export const ExportIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M12 15V3M7.5 7.5L12 3l4.5 4.5" />
  </Svg>
);

export const RefreshIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 4v5h-5" />
  </Svg>
);

/* --- 节点类型 --- */

export const ServerIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="7" rx="2" />
    <rect x="3" y="13" width="18" height="7" rx="2" />
    <path d="M7 7.5h.01M7 16.5h.01" />
  </Svg>
);

export const ServiceIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4 15a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 5.3 8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 11 4V3.8a2 2 0 1 1 4 0V4a1.7 1.7 0 0 0 3 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.1z" />
  </Svg>
);

export const DatabaseIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </Svg>
);

export const CacheIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M3 7h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    <path d="M3 7V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1M8 11v2M12 11v2M16 11v2" />
  </Svg>
);

export const QueueIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h7" />
    <path d="M17 15.5l2.5 2.5L17 20.5" />
  </Svg>
);

export const GatewayIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M4 20V9l6-4 6 4v11" />
    <path d="M16 20h4v-6l-4-3" />
    <path d="M10 20v-5h4v5" />
  </Svg>
);

export const BalanceIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M12 3v18M5 8h14" />
    <path d="M8 8l-3 6h6L8 8zM16 8l-3 6h6l-3-6zM8 21h8" />
  </Svg>
);

export const BoxIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </Svg>
);

export const FolderIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
  </Svg>
);

export const TextIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M5 6V5h14v1M12 5v14M9 19h6" />
  </Svg>
);

/* --- 面板 / 状态 --- */

export const GlobeIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
  </Svg>
);

export const SearchIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5" />
  </Svg>
);

export const RocketIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M12 3c3.5 0 6 2.5 6 6 0 4-3 7-6 9-3-2-6-5-6-9 0-3.5 2.5-6 6-6z" />
    <circle cx="12" cy="9" r="2" />
    <path d="M8 16l-2 4 4-1.5M16 16l2 4-4-1.5" />
  </Svg>
);

export const WrenchIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M15.5 3.5a5.5 5.5 0 0 0-6.6 7.2L3.6 16a2 2 0 1 0 2.8 2.8l5.3-5.3a5.5 5.5 0 0 0 7.2-6.6l-3 3-2.8-.7-.7-2.8 3-3z" />
  </Svg>
);

export const CloseIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const SettingsIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4L7 17M17 7l1.4-1.4" />
  </Svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
);

export const ChevronRightIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
