import { MenuItemId } from './menuItems';
import ArchitectureView from '../views/ArchitectureView';
import MonitoringViewWrapper from '../views/MonitoringViewWrapper';
import UnderDevelopmentView from '../views/UnderDevelopmentView';

/**
 * 视图组件映射配置
 * 将菜单项 ID 映射到对应的视图组件
 * 如果菜单项没有对应的视图组件，将显示 UnderDevelopmentView
 */
export const VIEW_COMPONENTS: Partial<Record<MenuItemId, React.ComponentType<any>>> = {
  architecture: ArchitectureView,
  monitoring: MonitoringViewWrapper,
};

/**
 * 获取视图组件，如果不存在则返回开发中视图
 */
export const getViewComponent = (menuItemId: MenuItemId): React.ComponentType<any> => {
  return VIEW_COMPONENTS[menuItemId] || UnderDevelopmentView;
};
