-- 数据库状态值回滚脚本
-- 将 'running' 改回 'healthy'，'error' 改回 'unhealthy'

-- 开始事务
BEGIN TRANSACTION;

-- 1. 回滚 node_states 表
UPDATE node_states 
SET status = 'healthy', updated_at = CURRENT_TIMESTAMP 
WHERE status = 'running';

UPDATE node_states 
SET status = 'unhealthy', updated_at = CURRENT_TIMESTAMP 
WHERE status = 'error';

-- 2. 回滚 status_history 表
UPDATE status_history 
SET status = 'healthy' 
WHERE status = 'running';

UPDATE status_history 
SET status = 'unhealthy' 
WHERE status = 'error';

-- 提交事务
COMMIT;

-- 验证回滚结果
SELECT 'node_states 表状态分布:' as info;
SELECT status, COUNT(*) as count 
FROM node_states 
GROUP BY status;

SELECT 'status_history 表状态分布:' as info;
SELECT status, COUNT(*) as count 
FROM status_history 
GROUP BY status;

-- 检查是否还有新的状态值
SELECT 'node_states 表中的新状态值:' as info;
SELECT COUNT(*) as new_status_count 
FROM node_states 
WHERE status IN ('running', 'error');

SELECT 'status_history 表中的新状态值:' as info;
SELECT COUNT(*) as new_status_count 
FROM status_history 
WHERE status IN ('running', 'error');
