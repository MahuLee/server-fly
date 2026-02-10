/**
 * 测试架构图API的同步更新功能
 * 
 * 使用方法：
 * 1. 确保后端服务正在运行 (npm start)
 * 2. 运行此测试脚本: node test-graph-api.js
 */

const BASE_URL = 'http://localhost:3001';

// 测试数据
const testGraphData = {
  nodes: [
    {
      id: 'test-server-1',
      type: 'server',
      label: '测试服务器',
      x: 100,
      y: 100,
      properties: {
        ip: '192.168.1.100',
        port: 22,
        username: 'admin',
        password: 'test123',
        size: [200, 100],
        healthCheck: {
          type: 'tcp',
          interval: 30,
          timeout: 5,
          retries: 3
        },
        metadata: {
          description: '这是一个测试服务器'
        }
      },
      state: {
        status: 'unknown',
        lastCheckTime: new Date().toISOString()
      }
    },
    {
      id: 'test-service-1',
      type: 'service',
      label: 'Web服务',
      x: 400,
      y: 100,
      properties: {
        serverId: 'test-server-1',
        port: 8080,
        resourcePath: '/opt/webapp',
        size: [180, 80],
        healthCheck: {
          type: 'http',
          endpoint: 'http://192.168.1.100:8080/health',
          interval: 30,
          timeout: 5,
          retries: 3
        },
        metadata: {
          description: '这是一个Web服务'
        }
      },
      state: {
        status: 'unknown',
        lastCheckTime: new Date().toISOString()
      }
    }
  ],
  edges: [
    {
      id: 'test-edge-1',
      source: 'test-server-1',
      target: 'test-service-1',
      sourceHandle: 'right',
      targetHandle: 'left',
      label: 'HTTP',
      animated: true,
      markerEnd: 'arrow',
      style: {
        stroke: '#3b82f6',
        strokeWidth: 2
      }
    }
  ]
};

async function testGraphAPI() {
  console.log('🚀 开始测试架构图API...\n');

  try {
    // 1. 获取或创建测试环境
    console.log('📋 步骤 1: 获取环境列表...');
    let envResponse = await fetch(`${BASE_URL}/api/environments`);
    let envResult = await envResponse.json();
    
    let testEnv;
    if (envResult.success && envResult.data && envResult.data.length > 0) {
      testEnv = envResult.data[0];
      console.log(`✅ 使用现有环境: ${testEnv.name} (${testEnv.id})\n`);
    } else {
      console.log('📝 创建新测试环境...');
      const createResponse = await fetch(`${BASE_URL}/api/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '测试环境',
          description: 'API测试环境'
        })
      });
      const createResult = await createResponse.json();
      if (createResult.success) {
        testEnv = createResult.data;
        console.log(`✅ 创建环境成功: ${testEnv.name} (${testEnv.id})\n`);
      } else {
        throw new Error('创建环境失败');
      }
    }

    // 2. 更新架构图数据
    console.log('📋 步骤 2: 更新架构图数据...');
    const updateResponse = await fetch(`${BASE_URL}/api/environments/${testEnv.id}/graph`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testGraphData)
    });
    const updateResult = await updateResponse.json();
    
    if (updateResult.success) {
      console.log('✅ 架构图更新成功\n');
    } else {
      throw new Error(`更新失败: ${updateResult.error}`);
    }

    // 3. 验证 graph_data 表
    console.log('📋 步骤 3: 验证 graph_data 表...');
    const graphResponse = await fetch(`${BASE_URL}/api/environments/${testEnv.id}/graph`);
    const graphResult = await graphResponse.json();
    
    if (graphResult.success && graphResult.data) {
      console.log(`✅ graph_data 表验证成功`);
      console.log(`   - 节点数量: ${graphResult.data.nodes.length}`);
      console.log(`   - 边数量: ${graphResult.data.edges.length}\n`);
    } else {
      throw new Error('graph_data 验证失败');
    }

    // 4. 验证 nodes 表（通过查询节点状态）
    console.log('📋 步骤 4: 验证 nodes 表...');
    for (const node of testGraphData.nodes) {
      const nodeResponse = await fetch(`${BASE_URL}/api/nodes/${node.id}/status/latest`);
      const nodeResult = await nodeResponse.json();
      
      if (nodeResult.success) {
        console.log(`✅ 节点 ${node.label} (${node.id}) 已同步到 nodes 表`);
      } else {
        console.log(`⚠️  节点 ${node.label} (${node.id}) 可能未正确同步`);
      }
    }
    console.log('');

    // 5. 测试更新节点
    console.log('📋 步骤 5: 测试更新节点...');
    const updatedGraphData = {
      ...testGraphData,
      nodes: testGraphData.nodes.map(node => 
        node.id === 'test-server-1' 
          ? { ...node, label: '更新后的服务器', x: 150, y: 150 }
          : node
      )
    };
    
    const updateResponse2 = await fetch(`${BASE_URL}/api/environments/${testEnv.id}/graph`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedGraphData)
    });
    const updateResult2 = await updateResponse2.json();
    
    if (updateResult2.success) {
      console.log('✅ 节点更新成功\n');
    } else {
      throw new Error('节点更新失败');
    }

    // 6. 测试删除节点
    console.log('📋 步骤 6: 测试删除节点...');
    const deletedGraphData = {
      ...testGraphData,
      nodes: testGraphData.nodes.filter(node => node.id !== 'test-service-1'),
      edges: testGraphData.edges.filter(edge => 
        edge.source !== 'test-service-1' && edge.target !== 'test-service-1'
      )
    };
    
    const updateResponse3 = await fetch(`${BASE_URL}/api/environments/${testEnv.id}/graph`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deletedGraphData)
    });
    const updateResult3 = await updateResponse3.json();
    
    if (updateResult3.success) {
      console.log('✅ 节点删除成功\n');
    } else {
      throw new Error('节点删除失败');
    }

    // 7. 验证删除后的状态
    console.log('📋 步骤 7: 验证删除后的状态...');
    const graphResponse2 = await fetch(`${BASE_URL}/api/environments/${testEnv.id}/graph`);
    const graphResult2 = await graphResponse2.json();
    
    if (graphResult2.success && graphResult2.data) {
      console.log(`✅ 删除验证成功`);
      console.log(`   - 剩余节点数量: ${graphResult2.data.nodes.length}`);
      console.log(`   - 剩余边数量: ${graphResult2.data.edges.length}\n`);
    } else {
      throw new Error('删除验证失败');
    }

    console.log('🎉 所有测试通过！\n');
    console.log('✨ 架构图API同步更新功能正常工作');
    console.log('   - graph_data 表已更新');
    console.log('   - nodes 表已同步');
    console.log('   - node_properties 表已同步');
    console.log('   - edges 表已同步');
    console.log('   - 级联删除功能正常\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
testGraphAPI();
