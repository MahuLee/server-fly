-- 数据库状态值迁移脚本
-- 将 'healthy' 改为 'running'，'unhealthy' 改为 'error'

-- 开始事务
BEGIN TRANSACTION;

-- 1. 迁移 node_states 表
UPDATE node_states 
SET status = 'running', updated_at = CURRENT_TIMESTAMP 
WHERE status = 'healthy';

UPDATE node_states 
SET status = 'error', updated_at = CURRENT_TIMESTAMP 
WHERE status = 'unhealthy';

-- 2. 迁移 status_history 表
UPDATE status_history 
SET status = 'running' 
WHERE status = 'healthy';

UPDATE status_history 
SET status = 'error' 
WHERE status = 'unhealthy';

-- 提交事务
COMMIT;

-- 验证迁移结果
SELECT 'node_states 表状态分布:' as info;
SELECT status, COUNT(*) as count 
FROM node_states 
GROUP BY status;

SELECT 'status_history 表状态分布:' as info;
SELECT status, COUNT(*) as count 
FROM status_history 
GROUP BY status;

-- 检查是否还有旧的状态值
SELECT 'node_states 表中的旧状态值:' as info;
SELECT COUNT(*) as old_status_count 
FROM node_states 
WHERE status IN ('healthy', 'unhealthy');

SELECT 'status_history 表中的旧状态值:' as info;
SELECT COUNT(*) as old_status_count 
FROM status_history 
WHERE status IN ('healthy', 'unhealthy');
