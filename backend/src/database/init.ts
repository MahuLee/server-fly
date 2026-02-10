import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/monitoring.db');

let db: SqlJsDatabase;
let SQL: any;

// 初始化 sql.js
async function initSqlJsModule() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
}

// 从文件加载数据库或创建新的
async function loadOrCreateDatabase(): Promise<SqlJsDatabase> {
  await initSqlJsModule();
  
  // 确保数据目录存在
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // 如果文件存在，加载它
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    return new SQL.Database(buffer);
  }
  
  // 否则创建新数据库
  return new SQL.Database();
}

// 保存数据库到文件
function saveDatabase() {
  if (!db) return;
  
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// 迁移数据库结构 - 添加缺失的字段
function migrateDatabase() {
  try {
    // 检查并添加 nodes 表的缺失字段
    const nodesColumns = query(`PRAGMA table_info(nodes)`);
    const nodesColumnNames = nodesColumns.map((col: any) => col.name);
    
    if (!nodesColumnNames.includes('width')) {
      logger.info('Adding width column to nodes table...');
      execute(`ALTER TABLE nodes ADD COLUMN width REAL`);
    }
    if (!nodesColumnNames.includes('height')) {
      logger.info('Adding height column to nodes table...');
      execute(`ALTER TABLE nodes ADD COLUMN height REAL`);
    }

    // 检查并添加 node_properties 表的缺失字段
    const propsColumns = query(`PRAGMA table_info(node_properties)`);
    const propsColumnNames = propsColumns.map((col: any) => col.name);
    
    if (!propsColumnNames.includes('ip')) {
      logger.info('Adding ip column to node_properties table...');
      execute(`ALTER TABLE node_properties ADD COLUMN ip TEXT`);
    }
    if (!propsColumnNames.includes('port')) {
      logger.info('Adding port column to node_properties table...');
      execute(`ALTER TABLE node_properties ADD COLUMN port INTEGER`);
    }
    if (!propsColumnNames.includes('username')) {
      logger.info('Adding username column to node_properties table...');
      execute(`ALTER TABLE node_properties ADD COLUMN username TEXT`);
    }
    if (!propsColumnNames.includes('password')) {
      logger.info('Adding password column to node_properties table...');
      execute(`ALTER TABLE node_properties ADD COLUMN password TEXT`);
    }
    if (!propsColumnNames.includes('server_id')) {
      logger.info('Adding server_id column to node_properties table...');
      execute(`ALTER TABLE node_properties ADD COLUMN server_id TEXT`);
    }
    if (!propsColumnNames.includes('resource_path')) {
      logger.info('Adding resource_path column to node_properties table...');
      execute(`ALTER TABLE node_properties ADD COLUMN resource_path TEXT`);
    }

    // 检查并添加 edges 表的缺失字段
    const edgesColumns = query(`PRAGMA table_info(edges)`);
    const edgesColumnNames = edgesColumns.map((col: any) => col.name);
    
    if (!edgesColumnNames.includes('source_handle')) {
      logger.info('Adding source_handle column to edges table...');
      execute(`ALTER TABLE edges ADD COLUMN source_handle TEXT`);
    }
    if (!edgesColumnNames.includes('target_handle')) {
      logger.info('Adding target_handle column to edges table...');
      execute(`ALTER TABLE edges ADD COLUMN target_handle TEXT`);
    }
    if (!edgesColumnNames.includes('animated')) {
      logger.info('Adding animated column to edges table...');
      execute(`ALTER TABLE edges ADD COLUMN animated INTEGER DEFAULT 0`);
    }
    if (!edgesColumnNames.includes('marker_end')) {
      logger.info('Adding marker_end column to edges table...');
      execute(`ALTER TABLE edges ADD COLUMN marker_end TEXT`);
    }

    // 迁移 metrics_data 表结构
    const metricsColumns = query(`PRAGMA table_info(metrics_data)`);
    const metricsColumnNames = metricsColumns.map((col: any) => col.name);
    
    // 如果存在旧字段 name, value, unit，需要迁移到新结构
    if (metricsColumnNames.includes('name') && metricsColumnNames.includes('value')) {
      logger.info('Migrating metrics_data table to new schema...');
      
      // 1. 创建新表
      execute(`CREATE TABLE IF NOT EXISTS metrics_data_new (
        id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
      )`);
      
      // 2. 迁移数据 - 将旧的 name, value, unit, threshold_violation 合并为 JSON
      const oldMetrics = query(`SELECT * FROM metrics_data`);
      for (const metric of oldMetrics) {
        const jsonData = JSON.stringify({
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
          thresholdViolation: metric.threshold_violation
        });
        
        execute(
          `INSERT INTO metrics_data_new (id, node_id, data, timestamp, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [metric.id, metric.node_id, jsonData, metric.timestamp, metric.created_at]
        );
      }
      
      // 3. 删除旧表
      execute(`DROP TABLE metrics_data`);
      
      // 4. 重命名新表
      execute(`ALTER TABLE metrics_data_new RENAME TO metrics_data`);
      
      // 5. 重建索引
      execute(`CREATE INDEX IF NOT EXISTS idx_metrics_data_node_id ON metrics_data(node_id)`);
      execute(`CREATE INDEX IF NOT EXISTS idx_metrics_data_timestamp ON metrics_data(timestamp)`);
      
      logger.info('metrics_data table migration completed');
    }

    logger.info('Database migration completed');
  } catch (error) {
    logger.error('Error during database migration:', error);
  }
}

// 初始化表结构
function createTables() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS graph_data (
      id TEXT PRIMARY KEY,
      environment_id TEXT NOT NULL UNIQUE,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      environment_id TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL,
      height REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS node_properties (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL UNIQUE,
      ip TEXT,
      port INTEGER,
      username TEXT,
      password TEXT,
      server_id TEXT,
      resource_path TEXT,
      health_check TEXT,
      metrics TEXT,
      actions TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS node_states (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'unknown',
      last_check_time DATETIME,
      message TEXT,
      metrics TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS metrics_data (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      data TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      timestamp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS action_logs (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      action TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      message TEXT,
      output TEXT,
      timestamp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      environment_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      source_handle TEXT,
      target_handle TEXT,
      label TEXT,
      style TEXT,
      animated INTEGER DEFAULT 0,
      marker_end TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
      FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE
    )`,
    
    // 创建索引
    `CREATE INDEX IF NOT EXISTS idx_nodes_environment_id ON nodes(environment_id)`,
    `CREATE INDEX IF NOT EXISTS idx_metrics_data_node_id ON metrics_data(node_id)`,
    `CREATE INDEX IF NOT EXISTS idx_metrics_data_timestamp ON metrics_data(timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_status_history_node_id ON status_history(node_id)`,
    `CREATE INDEX IF NOT EXISTS idx_status_history_timestamp ON status_history(timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_action_logs_node_id ON action_logs(node_id)`,
    `CREATE INDEX IF NOT EXISTS idx_edges_environment_id ON edges(environment_id)`
  ];
  
  statements.forEach(stmt => {
    try {
      db.run(stmt);
    } catch (error) {
      logger.error('Error creating table:', error);
    }
  });
  
  // 执行数据库迁移
  migrateDatabase();
  
  saveDatabase();
}

// 初始化数据库
export async function initializeDatabase(): Promise<SqlJsDatabase> {
  db = await loadOrCreateDatabase();
  createTables();
  return db;
}

// 获取数据库实例
export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// 执行查询（返回结果）
export function query(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  
  return results;
}

// 执行更新/插入/删除
export function execute(sql: string, params: any[] = []): void {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  
  saveDatabase();
}

// 执行多条语句（事务）
export function transaction(callback: () => void): void {
  try {
    callback();
    saveDatabase();
  } catch (error) {
    throw error;
  }
}

// 关闭数据库
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
  }
}
