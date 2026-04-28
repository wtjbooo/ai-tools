export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();
    const selectedModel = model || 'gpt-4o-mini';

    let apiKey = '';
    let baseURL = '';

    if (selectedModel.startsWith('gpt') || selectedModel.startsWith('claude')) {
      apiKey = selectedModel.startsWith('gpt') ? (process.env.OPENAI_GROUP_KEY || '') : (process.env.CLAUDE_GROUP_KEY || '');
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } else if (selectedModel === 'gemini-1.5-pro') {
      apiKey = process.env.GEMINI_GROUP_KEY || '';
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } else if (selectedModel === 'gemini-1.5-flash') {
      apiKey = process.env.GEMINI_API_KEY || '';
      baseURL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
    } else if (selectedModel.startsWith('deepseek')) {
      apiKey = process.env.DEEPSEEK_API_KEY || '';
      baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    } else if (selectedModel.startsWith('LongCat') || selectedModel.toLowerCase().includes('longcat')) {
      apiKey = process.env.LONGCAT_API_KEY || '';
      baseURL = process.env.LONGCAT_BASE_URL || 'https://api.longcat.chat/openai/v1'; 
    }

    // 🌟 强力清洗环境变量
    apiKey = apiKey.replace(/['"]/g, '').trim();
    baseURL = baseURL.replace(/['"]/g, '').trim();

    if (!apiKey) {
      throw new Error(`未找到模型 ${selectedModel} 对应的 API Key，请检查服务器 .env 配置`);
    }

    // 智能拼接 URL，防止多加或漏加 /chat/completions
    const apiUrl = baseURL.endsWith('/chat/completions') 
      ? baseURL 
      : `${baseURL.replace(/\/$/, '')}/chat/completions`;

    // 🚨 终极方案：完全抛弃 Vercel AI SDK，使用原生 Fetch 代理！
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        stream: true
      })
    });

    // 拦截 1：硬性 HTTP 错误 (如 401 未授权, 403 余额不足)
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[上游 API 拒绝请求] 状态码: ${response.status}, 详情: ${errorText}`);
      throw new Error(`API 拒绝调用 (${response.status}): ${errorText}`);
    }

    // 拦截 2：伪装成 200 OK 的 JSON 报错 (这是导致你白板的终极元凶！)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await response.text();
      console.error(`[上游 API 伪装报错] 详情: ${errorData}`);
      throw new Error(`API 返回了异常信息: ${errorData}`);
    }

    // 🌟 手动解析标准的 OpenAI SSE 流，提取文字发送给前端
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
            buffer = lines.pop() || ''; // 保留最后一行未完整接收的数据片段

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
              
              if (trimmedLine.startsWith('data: ')) {
                try {
                  const jsonStr = trimmedLine.slice(6);
                  const data = JSON.parse(jsonStr);
                  
                  // 🔥 完美兼容标准 content 和 DeepSeek R1 的 reasoning_content 深度思考内容！
                  const delta = data.choices?.[0]?.delta;
                  if (delta) {
                    const chunkText = delta.content || delta.reasoning_content || '';
                    if (chunkText) {
                      controller.enqueue(encoder.encode(chunkText));
                    }
                  }
                } catch (e) {
                  // 忽略单行 JSON 解析错误，防止流崩溃
                }
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