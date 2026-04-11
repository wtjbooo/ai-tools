// test-api.js
const { ProxyAgent, setGlobalDispatcher } = require('undici');

// 1. 设置代理（根据你的实际情况修改端口）
const dispatcher = new ProxyAgent('http://127.0.0.1:7890');
setGlobalDispatcher(dispatcher);

// 2. 准备配置
const API_KEY = 'sk-DP39wiQ5XkNu2puHPbgEEsvD9r6j3YMyEyHxZXtEMs5yQBh3';
const API_URL = 'https://api.n1n.ai/v1/chat/completions';

async function testConnection() {
  console.log("开始发送测试请求...");
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // 先用最稳定、最便宜的文本模型测试连通性
        messages: [{ role: "user", content: "你好，请回复'连接成功'" }],
        stream: false
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ 测试成功！返回结果：", data.choices[0].message.content);
    } else {
      console.error("❌ 请求失败，API 返回错误：", data);
    }
    
  } catch (error) {
    console.error("🚫 网络连接彻底失败：", error.message);
  }
}

testConnection();