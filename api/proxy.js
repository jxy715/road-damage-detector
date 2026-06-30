/**
 * Vercel Serverless Function - DashScope API 代理
 * 
 * 接收前端请求，转发到阿里云 DashScope，返回结果。
 * 部署到 Vercel 后，前端可直接调用 /api/proxy，无需本地代理服务器。
 */

export default async function handler(req, res) {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  // OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只接受 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: '缺少 API Key（请在前端配置面板中填写）' });
  }

  try {
    const dashscopeResponse = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await dashscopeResponse.json();

    if (!dashscopeResponse.ok) {
      return res.status(dashscopeResponse.status).json({
        error: data.error?.message || data.message || 'DashScope API 请求失败',
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({
      error: `代理请求失败: ${err.message}`,
    });
  }
}
