import ServerNode from './ServerNode';
import ServiceNode from './ServiceNode';
import DatabaseNode from './DatabaseNode';
import GenericNode from './GenericNode';
import TextNode from './TextNode';
import GroupNode from './GroupNode';

// 节点图标映射
export const NODE_ICONS: Record<string, string> = {
  server: '🖥️',
  service: '⚙️',
  database: '🗄️',
  cache: '💾',
  queue: '📬',
  gateway: '🚪',
  loadbalancer: '⚖️',
  group: '📁',
  custom: '📦',
  text: '📝'
};

// 节点类型映射
export const nodeTypes = {
  server: ServerNode,
  service: ServiceNode,
  database: DatabaseNode,
  cache: GenericNode,
  queue: GenericNode,
  gateway: GenericNode,
  loadbalancer: GenericNode,
  group: GroupNode,
  custom: GenericNode,
  text: TextNode
};

export { ServerNode, ServiceNode, DatabaseNode, GenericNode, TextNode, GroupNode };
