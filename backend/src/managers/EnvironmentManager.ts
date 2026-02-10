import { Environment, GraphData } from '../types';
import { query, execute, transaction } from '../database/init';
import { logger } from '../utils/logger';

const uuid: any = require('uuid');

/**
 * EnvironmentManager �?
 * 负责管理多环境配置和隔离
 */
export class EnvironmentManager {
  /**
   * 创建环境
   * @param name 环境名称
   * @param description 环境描述
   * @returns 创建的环境对�?
   */
  async createEnvironment(name: string, description: string): Promise<Environment> {
    // 验证必填字段
    if (!name || !name.trim() || !description || !description.trim()) {
      throw new Error('Environment name and description are required');
    }

    const id = uuid.v4();
    const now = new Date();

    try {
      transaction(() => {
        // 插入环境记录
        execute(
          `INSERT INTO environments (id, name, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          [id, name, description, now.toISOString(), now.toISOString()]
        );

        // 为新环境创建空的架构图数�?
        const graphId = uuid.v4();
        const emptyGraph: GraphData = {
          nodes: [],
          edges: [],
          layout: {}
        };

        execute(
          `INSERT INTO graph_data (id, environment_id, data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          [graphId, id, JSON.stringify(emptyGraph), now.toISOString(), now.toISOString()]
        );
      });

      return {
        id,
        name,
        description,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      throw new Error(`Failed to create environment: ${error}`);
    }
  }

  /**
   * 获取环境
   * @param envId 环境 ID
   * @returns 环境对象
   */
  async getEnvironment(envId: string): Promise<Environment | null> {
    try {
      const results = query(
        `SELECT id, name, description, created_at, updated_at FROM environments WHERE id = ?`,
        [envId]
      );

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      throw new Error(`Failed to get environment: ${error}`);
    }
  }

  /**
   * 列出所有环�?
   * @returns 环境列表
   */
  async listEnvironments(): Promise<Environment[]> {
    try {
      const results = query(
        `SELECT id, name, description, created_at, updated_at FROM environments ORDER BY created_at DESC`
      );

      return results.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      throw new Error(`Failed to list environments: ${error}`);
    }
  }

  /**
   * 更新环境
   * @param envId 环境 ID
   * @param updates 更新的字�?
   * @returns 更新后的环境对象
   */
  async updateEnvironment(
    envId: string,
    updates: Partial<Environment>
  ): Promise<Environment> {
    // 获取现有环境
    const existing = await this.getEnvironment(envId);
    if (!existing) {
      throw new Error(`Environment with id ${envId} not found`);
    }

    const now = new Date();
    const name = updates.name || existing.name;
    const description = updates.description || existing.description;

    try {
      execute(
        `UPDATE environments SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
        [name, description, now.toISOString(), envId]
      );

      return {
        id: envId,
        name,
        description,
        createdAt: existing.createdAt,
        updatedAt: now
      };
    } catch (error) {
      throw new Error(`Failed to update environment: ${error}`);
    }
  }

  /**
   * 删除环境
   * @param envId 环境 ID
   */
  async deleteEnvironment(envId: string): Promise<void> {
    try {
      // 验证环境存在
      const env = await this.getEnvironment(envId);
      if (!env) {
        throw new Error(`Environment with id ${envId} not found`);
      }

      logger.info(`Deleting environment: ${env.name} (${envId})`);

      transaction(() => {
        // 1. 获取该环境下的所有节点
        const nodes = query(
          `SELECT id FROM nodes WHERE environment_id = ?`,
          [envId]
        );

        logger.debug(`Found ${nodes.length} nodes to delete`);

        // 2. 删除每个节点的相关数据
        nodes.forEach((node: any) => {
          const nodeId = node.id;

          // 删除节点的指标数据
          execute(`DELETE FROM metrics_data WHERE node_id = ?`, [nodeId]);

          // 删除节点的状态历史
          execute(`DELETE FROM status_history WHERE node_id = ?`, [nodeId]);

          // 删除节点的操作日志
          execute(`DELETE FROM action_logs WHERE node_id = ?`, [nodeId]);

          // 删除节点的状态
          execute(`DELETE FROM node_states WHERE node_id = ?`, [nodeId]);

          // 删除节点的属性
          execute(`DELETE FROM node_properties WHERE node_id = ?`, [nodeId]);
        });

        // 3. 删除该环境下的所有边
        execute(`DELETE FROM edges WHERE environment_id = ?`, [envId]);
        logger.debug(`Deleted edges for environment ${envId}`);

        // 4. 删除该环境下的所有节点
        execute(`DELETE FROM nodes WHERE environment_id = ?`, [envId]);
        logger.debug(`Deleted nodes for environment ${envId}`);

        // 5. 删除架构图数据
        execute(`DELETE FROM graph_data WHERE environment_id = ?`, [envId]);
        logger.debug(`Deleted graph_data for environment ${envId}`);

        // 6. 最后删除环境本身
        execute(`DELETE FROM environments WHERE id = ?`, [envId]);
        logger.info(`Environment ${env.name} (${envId}) deleted successfully`);
      });
    } catch (error) {
      logger.error(`Failed to delete environment ${envId}:`, error);
      throw new Error(`Failed to delete environment: ${error}`);
    }
  }

  /**
   * 复制环境
   * @param sourceEnvId 源环�?ID
   * @param newName 新环境名�?
   * @returns 新创建的环境对象
   */
  async cloneEnvironment(sourceEnvId: string, newName: string): Promise<Environment> {
    // 获取源环�?
    const sourceEnv = await this.getEnvironment(sourceEnvId);
    if (!sourceEnv) {
      throw new Error(`Source environment with id ${sourceEnvId} not found`);
    }

    // 验证新名称不重复
    const existing = query(
      `SELECT id FROM environments WHERE name = ?`,
      [newName]
    );
    if (existing.length > 0) {
      throw new Error(`Environment with name ${newName} already exists`);
    }

    const newEnvId = uuid.v4();
    const now = new Date();

    try {
      transaction(() => {
        // 创建新环�?
        execute(
          `INSERT INTO environments (id, name, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          [newEnvId, newName, sourceEnv.description, now.toISOString(), now.toISOString()]
        );

        // 复制架构图数�?
        const sourceGraphResults = query(
          `SELECT data FROM graph_data WHERE environment_id = ?`,
          [sourceEnvId]
        );

        if (sourceGraphResults.length > 0) {
          const sourceGraphData = sourceGraphResults[0].data;
          const newGraphId = uuid.v4();

          execute(
            `INSERT INTO graph_data (id, environment_id, data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
            [newGraphId, newEnvId, sourceGraphData, now.toISOString(), now.toISOString()]
          );
        }

        // 复制节点
        const sourceNodes = query(
          `SELECT id, type, label, x, y FROM nodes WHERE environment_id = ?`,
          [sourceEnvId]
        );

        const nodeIdMap = new Map<string, string>();

        sourceNodes.forEach(node => {
          const newNodeId = uuid.v4();
          nodeIdMap.set(node.id, newNodeId);

          execute(
            `INSERT INTO nodes (id, environment_id, type, label, x, y, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newNodeId,
              newEnvId,
              node.type,
              node.label,
              node.x,
              node.y,
              now.toISOString(),
              now.toISOString()
            ]
          );

          // 复制节点属�?
          const nodeProps = query(
            `SELECT health_check, metrics, actions, metadata FROM node_properties WHERE node_id = ?`,
            [node.id]
          );

          if (nodeProps.length > 0) {
            const prop = nodeProps[0];
            const propId = uuid.v4();

            execute(
              `INSERT INTO node_properties (id, node_id, health_check, metrics, actions, metadata, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                propId,
                newNodeId,
                prop.health_check,
                prop.metrics,
                prop.actions,
                prop.metadata,
                now.toISOString(),
                now.toISOString()
              ]
            );
          }

          // 复制节点状�?
          const nodeStates = query(
            `SELECT status, last_check_time, message, metrics FROM node_states WHERE node_id = ?`,
            [node.id]
          );

          if (nodeStates.length > 0) {
            const state = nodeStates[0];
            const stateId = uuid.v4();

            execute(
              `INSERT INTO node_states (id, node_id, status, last_check_time, message, metrics, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                stateId,
                newNodeId,
                state.status,
                state.last_check_time,
                state.message,
                state.metrics,
                now.toISOString(),
                now.toISOString()
              ]
            );
          }
        });

        // 复制�?
        const sourceEdges = query(
          `SELECT id, source_id, target_id, label, style FROM edges WHERE environment_id = ?`,
          [sourceEnvId]
        );

        sourceEdges.forEach(edge => {
          const newEdgeId = uuid.v4();
          const newSourceId = nodeIdMap.get(edge.source_id) || edge.source_id;
          const newTargetId = nodeIdMap.get(edge.target_id) || edge.target_id;

          execute(
            `INSERT INTO edges (id, environment_id, source_id, target_id, label, style, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newEdgeId,
              newEnvId,
              newSourceId,
              newTargetId,
              edge.label,
              edge.style,
              now.toISOString(),
              now.toISOString()
            ]
          );
        });
      });

      return {
        id: newEnvId,
        name: newName,
        description: sourceEnv.description,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      throw new Error(`Failed to clone environment: ${error}`);
    }
  }
}

export default EnvironmentManager;

