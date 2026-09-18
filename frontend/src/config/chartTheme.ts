/**
 * 图表 / Canvas 配色
 *
 * ponytail: 不跟随主题实时切换 —— theme 状态在 App 且未下传监控子树，
 * 做响应式需要引入 context 与重渲染管道。这组中性色在浅/深底上都可读，
 * 所以先用单一常量。若日后需要跟随主题，把图表包一层订阅主题的组件
 * 并重跑绘制即可。
 */
export const CHART_COLORS = {
  accent: '#0071e3',
  accentFill: 'rgba(0, 113, 227, 0.15)',
  grid: 'rgba(128, 128, 128, 0.2)',
  axis: '#86868b',
  success: '#34c759',
  warning: '#ff9f0a',
  critical: '#ff3b30',
} as const;

export type MetricStatus = 'normal' | 'warning' | 'critical';

export const metricStatusColor = (status: MetricStatus): string => {
  switch (status) {
    case 'critical':
      return CHART_COLORS.critical;
    case 'warning':
      return CHART_COLORS.warning;
    default:
      return CHART_COLORS.success;
  }
};
