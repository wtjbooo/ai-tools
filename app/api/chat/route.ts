export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();
    const selectedModel = model || 'gpt-4o-mini';

    let apiKey = '';
    let baseURL = '';
    // 🌟 核心新增：真正发给上游 API 的标准模型名称
    let apiModel = selectedModel; 

    if (selectedModel.startsWith('gpt') || selectedModel.startsWith('claude')) {
      apiKey = selectedModel.startsWith('gpt') ? (process.env.OPENAI_GROUP_KEY || '') : (process.env.CLAUDE_GROUP_KEY || '');
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } 
    else if (selectedModel === 'gemini-1.5-pro') {
      apiKey = process.env.GEMINI_GROUP_KEY || '';
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } 
    // 🚨 重点修复：完美囊括了前端传来的 gemini-2.5-flash、旧版 1.5 和别名 free
    else if (
      selectedModel.includes('gemini-2.5-flash') || 
      selectedModel.includes('gemini-1.5-flash') || 
      selectedModel.includes('gemini-free')
    ) {
      apiKey = process.env.GEMINI_API_KEY || '';
      baseURL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';
      apiModel = 'gemini-2.5-flash'; // 🔥 强行修正为最新版 API 认可的名称
    }
    else if (selectedModel.startsWith('deepseek')) {
      apiKey = process.env.DEEPSEEK_API_KEY || '';
      baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    } 
    else if (selectedModel.includes('LongCat') || selectedModel.toLowerCase().includes('longcat')) {
      apiKey = process.env.LONGCAT_API_KEY || '';
      baseURL = process.env.LONGCAT_BASE_URL || 'https://api.longcat.chat/v1'; 
      apiModel = 'LongCat-Flash-Thinking-2601'; 
    }

    // 🌟 强力清洗环境变量
    apiKey = apiKey.replace(/['"]/g, '').trim();
    baseURL = baseURL.replace(/['"]/g, '').trim();

    if (!apiKey) {
      throw new Error(`未找到模型 ${selectedModel} 对应的 API Key，请检查服务器 .env 配置`);
    }

    const apiUrl = baseURL.endsWith('/chat/completions') 
      ? baseURL 
      : `${baseURL.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: apiModel, 
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[上游 API 拒绝请求] 状态码: ${response.status}, 详情: ${errorText}`);
      throw new Error(`API 拒绝调用 (${response.status}): ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await response.text();
      throw new Error(`API 返回了异常信息: ${errorData}`);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }
        const decoder = new TextDecoder('utf-8');
        const encoder = new TextEncoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; 

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
              
              if (trimmedLine.startsWith('data: ')) {
                try {
                  const jsonStr = trimmedLine.slice(6);
                  const data = JSON.parse(jsonStr);
                  
                  const delta = data.choices?.[0]?.delta;
                  if (delta) {
                    const chunkText = delta.content || delta.reasoning_content || '';
                    if (chunkText) {
                      controller.enqueue(encoder.encode(chunkText));
                    }
                  }
                } catch (e) {}
              }
            }
          }
        } catch (err) {
          console.error('读取流时发生错误:', err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', 
      },
    });
    
  } catch (error: any) {
    console.error('Chat API 报错拦截:', error);
    return new Response(
      JSON.stringify({ error: `调用失败: ${error.message || '未知错误'}` }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}