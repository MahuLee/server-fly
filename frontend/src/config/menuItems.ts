import { MenuItem } from '../components/MainMenu';

/**
 * 主菜单配置
 * 添加新菜单项时，只需在此数组中添加新的配置即可
 */
export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'monitoring',
    label: '监控一览',
    icon: '📊',
  },
  {
    id: 'architecture',
    label: '服务架构',
    icon: '🏗️',
  },
  // 未来可以在这里添加更多菜单项，例如：
  {
    id: 'logs',
    label: '日志查询',
    icon: '📝',
  },
  {
    id: 'alerts',
    label: '告警管理',
    icon: '🔔',
  },
];

/**
 * 菜单项 ID 类型
 * 用于类型安全的菜单项引用
 */
export type MenuItemId = typeof MENU_ITEMS[number]['id'];
