/**
 * 测试 WebSocket 实时状态推送功能
 * 
 * 使用方法：
 * 1. 确保后端服务正在运行 (npm start)
 * 2. 确保前端"监控一览"界面已打开
 * 3. 运行此测试脚本: node test-websocket-push.js
 */

const BASE_URL = 'http://localhost:3001';

// 模拟不同的节点状态
const statusList = ['running', 'error', 'warning', 'unknown'];
const messages = {
  running: '服务运行正常',
  error: '服务连接失败',
  warning: 'CPU使用率过高',
  unknown: '无法获取状态'
};

/**
 * 获取随机状态
 */
function getRandomStatus() {
  return statusList[Math.floor(Math.random() * statusList.length)];
}

/**
 * 模拟健康检查并触发状态更新
 */
async function simulateHealthCheck(envId, nodeId, nodeName) {
  const status = getRandomStatus();
  const message = messages[status];
  
  console.log(`\n🔍 模拟健康检查: ${nodeName} (${nodeId})`);
  console.log(`   状态: ${status}`);
  console.log(`   消息: ${message}`);
  
  // 这里我们直接调用后端的健康检查API
  // 实际场景中，健康检查调度器会自动执行
  
  // 由于我们没有实际的健康检查API端点来手动触发，
  // 我们需要等待后端的健康检查调度器自动执行
  
  return { status, message };
}

/**
 * 获取环境中的所有节点
 */
async function getEnvironmentNodes(envId) {
  try {
    const response = await fetch(`${BASE_URL}/api/environments/${envId}/graph`);
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data.nodes;
    }
    return [];
  } catch (error) {
    console.error('获取节点失败:', error);
    return [];
  }
}

/**
 * 主测试函数
 */
async function testWebSocketPush() {
  console.log('🚀 开始测试 WebSocket 实时状态推送...\n');

  try {
    // 1. 获取环境列表
    console.log('📋 步骤 1: 获取环境列表...');
    const envResponse = await fetch(`${BASE_URL}/api/environments`);
    const envResult = await envResponse.json();
    
    if (!envResult.success || !envResult.data || envResult.data.length === 0) {
      console.error('❌ 没有找到环境，请先创建环境和节点');
      return;
    }
    
    const testEnv = envResult.data[0];
    console.log(`✅ 使用环境: ${testEnv.name} (${testEnv.id})\n`);

    // 2. 获取环境中的节点
    console.log('📋 步骤 2: 获取环境中的节点...');
    const nodes = await getEnvironmentNodes(testEnv.id);
    
    if (nodes.length === 0) {
      console.error('❌ 环境中没有节点，请先添加节点');
      return;
    }
    
    console.log(`✅ 找到 ${nodes.length} 个节点:\n`);
    nodes.forEach((node, index) => {
      console.log(`   ${index + 1}. ${node.label} (${node.type}) - ${node.id}`);
    });
    console.log('');

    // 3. 说明测试方法
    console.log('📋 步骤 3: WebSocket 推送测试说明\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✨ 实时状态推送工作流程：');
    console.log('');
    console.log('  1. 后端健康检查调度器定期执行健康检查');
    console.log('  2. 健康检查完成后，更新节点状态到数据库');
    console.log('  3. 通过 WebSocket 推送状态更新到前端');
    console.log('  4. 前端"监控一览"界面实时更新节点状态');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // 4. 验证 WebSocket 服务状态
    console.log('📋 步骤 4: 验证 WebSocket 服务状态...');
    try {
      const wsStatusResponse = await fetch(`${BASE_URL}/api/websocket/status`);
      const wsStatusResult = await wsStatusResponse.json();
      
      if (wsStatusResult.success) {
        console.log('✅ WebSocket 服务运行中');
        console.log(`   总连接数: ${wsStatusResult.data.totalClients}`);
        console.log(`   环境 ${testEnv.id} 的连接数: ${wsStatusResult.data.environments[testEnv.id] || 0}`);
        
        if (wsStatusResult.data.environments[testEnv.id] === 0) {
          console.log('\n⚠️  警告: 当前环境没有 WebSocket 客户端连接');
          console.log('   请确保前端"监控一览"界面已打开并选择了该环境\n');
        }
      }
    } catch (error) {
      console.error('❌ 无法获取 WebSocket 状态:', error.message);
    }
    console.log('');

    // 5. 检查节点的健康检查配置
    console.log('📋 步骤 5: 检查节点的健康检查配置...\n');
    let configuredNodes = 0;
    nodes.forEach((node) => {
      if (node.properties.healthCheck) {
        configuredNodes++;
        console.log(`✅ ${node.label}:`);
        console.log(`   类型: ${node.properties.healthCheck.type}`);
        console.log(`   间隔: ${node.properties.healthCheck.interval}秒`);
        console.log(`   超时: ${node.properties.healthCheck.timeout}秒`);
      } else {
        console.log(`⚠️  ${node.label}: 未配置健康检查`);
      }
    });
    
    if (configuredNodes === 0) {
      console.log('\n⚠️  警告: 没有节点配置了健康检查');
      console.log('   请在"服务架构"界面为节点配置健康检查\n');
    } else {
      console.log(`\n✅ ${configuredNodes}/${nodes.length} 个节点已配置健康检查\n`);
    }

    // 6. 前端验证步骤
    console.log('📋 步骤 6: 前端验证步骤\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('请在前端执行以下操作来验证实时推送：');
    console.log('');
    console.log('  1. 打开浏览器，访问前端应用 (http://localhost:3000)');
    console.log('  2. 切换到"监控一览"标签页');
    console.log(`  3. 选择环境: ${testEnv.name}`);
    console.log('  4. 观察右上角的连接状态指示器（应显示"实时监控中"）');
    console.log('  5. 观察节点的状态变化（颜色和状态会实时更新）');
    console.log('');
    console.log('预期效果：');
    console.log('  - 节点状态会根据健康检查结果实时变化');
    console.log('  - 正常: 绿色圆点');
    console.log('  - 异常: 红色圆点');
    console.log('  - 警告: 黄色圆点');
    console.log('  - 未知: 灰色圆点');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // 7. 查看后端日志
    console.log('📋 步骤 7: 监控后端日志\n');
    console.log('在后端终端中，你应该能看到类似以下的日志：');
    console.log('');
    console.log('  Client client_xxx connected to environment <envId>');
    console.log('  Broadcasted state_update to 1 clients in environment <envId>');
    console.log('');
    console.log('这表示 WebSocket 正在正常工作\n');

    // 8. 调试技巧
    console.log('📋 步骤 8: 调试技巧\n');
    console.log('如果状态没有实时更新，请检查：');
    console.log('');
    console.log('  1. 浏览器控制台 (F12)');
    console.log('     - 查看是否有 WebSocket 连接错误');
    console.log('     - 查看是否收到 state_update 消息');
    console.log('');
    console.log('  2. 后端日志');
    console.log('     - 查看健康检查是否正在执行');
    console.log('     - 查看 WebSocket 广播日志');
    console.log('');
    console.log('  3. 网络面板 (F12 -> Network -> WS)');
    console.log('     - 查看 WebSocket 连接状态');
    console.log('     - 查看消息收发情况');
    console.log('');

    console.log('🎉 测试准备完成！\n');
    console.log('💡 提示: 健康检查会根据配置的间隔自动执行');
    console.log('   默认间隔通常是 30 秒，请耐心等待状态更新\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
testWebSocketPush();
